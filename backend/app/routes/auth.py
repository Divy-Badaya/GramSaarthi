"""
GRAMSAARTHI — Authentication Routes
POST /api/auth/send-otp   → Send or generate OTP for phone verification
POST /api/auth/signup     → Fast registration (7 mandatory fields + optional email)
POST /api/auth/login      → Login via mobile number/email + password/PIN
POST /api/auth/logout     → Invalidate current session
GET  /api/auth/me         → Return profile of authenticated user
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.user import User
from app.schemas.user import (
    SendOtpRequest,
    SendOtpResponse,
    UserSignupRequest,
    UserLoginRequest,
    AuthTokenResponse,
    UserDetailedProfileResponse,
)
from app.services.auth_service import (
    send_or_generate_otp,
    verify_otp,
    hash_password,
    verify_password,
    create_access_token,
    get_current_user_required,
    clean_mobile_number,
)
from app.services.profile_service import calculate_profile_completion

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/send-otp",
    response_model=SendOtpResponse,
    summary="Send or generate OTP for mobile verification",
)
def send_otp(req: SendOtpRequest):
    """
    Generate a 6-digit OTP for the given mobile number.
    In prototype mode, returns the generated OTP in the response for quick testing.
    """
    phone = clean_mobile_number(req.mobile_number)
    if not phone or len(phone) != 10 or not phone.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid 10-digit mobile number.",
        )

    otp = send_or_generate_otp(phone)
    return SendOtpResponse(
        status="success",
        message=f"OTP sent successfully to +91 {phone}",
        otp=otp,
        expires_in=600,
    )


@router.post(
    "/signup",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Quick registration with 7 mandatory fields",
)
def signup(req: UserSignupRequest, db: Session = Depends(get_db)):
    """
    Register a new user with ONLY basic information:
    1. Full Name
    2. Mobile Number
    3. OTP Verification
    4. Password / PIN
    5. Preferred Language
    6. State
    7. District
    (Email is optional).
    """
    phone = clean_mobile_number(req.mobile_number)

    # 1. Verify OTP
    if not verify_otp(phone, req.otp):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP. Please use the OTP sent to your number (or 123456 in demo mode).",
        )

    # 2. Check duplicate mobile number
    existing_phone = db.query(User).filter(User.phone == phone).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An account with mobile number {phone} already exists. Please log in instead.",
        )

    # 3. Check duplicate email if provided
    email = req.email.strip().lower() if req.email and req.email.strip() else None
    if email:
        existing_email = db.query(User).filter(User.email == email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An account with email {email} already exists.",
            )

    # 4. Hash password
    hashed_pwd = hash_password(req.password)

    # 5. Create user
    user = User(
        name=req.full_name.strip(),
        phone=phone,
        email=email,
        language=req.preferred_language or "Hindi",
        state=req.state.strip(),
        district=req.district.strip(),
        hashed_password=hashed_pwd,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 6. Issue access token
    token = create_access_token(user.id, {"phone": user.phone})

    # 7. Compute profile completion
    completion = calculate_profile_completion(user)
    user_data = UserDetailedProfileResponse.model_validate(user)
    user_data.completion_percentage = completion["percentage"]

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_data,
    )


@router.post(
    "/login",
    response_model=AuthTokenResponse,
    summary="Login via mobile number or email + password/PIN",
)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user using mobile number OR email and password.
    Returns JWT token and user profile.
    """
    ident = req.identifier.strip()
    clean_phone = clean_mobile_number(ident)

    # Lookup by phone or email (flexible format matching)
    users = db.query(User).all()
    user = None
    for u in users:
        if u.phone and clean_mobile_number(u.phone) == clean_phone:
            user = u
            break
        if u.email and u.email.lower() == ident.lower():
            user = u
            break

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number/email or password.",
        )

    # Check account status BEFORE issuing a new token
    account_status = getattr(user, "status", "ACTIVE") or "ACTIVE"
    if account_status in ("BLACKLISTED", "SUSPENDED") or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled. Please contact GRAMSAARTHI support.",
        )

    if not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number/email or password.",
        )

    token = create_access_token(user.id, {"phone": user.phone})
    completion = calculate_profile_completion(user)
    user_data = UserDetailedProfileResponse.model_validate(user)
    user_data.completion_percentage = completion["percentage"]

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user=user_data,
    )


@router.post(
    "/logout",
    summary="Logout user session",
)
def logout():
    """Client simply discards the JWT token. Stateless endpoint."""
    return {"message": "Logged out successfully"}


@router.get(
    "/me",
    response_model=UserDetailedProfileResponse,
    summary="Get currently authenticated user",
)
def get_me(current_user: User = Depends(get_current_user_required)):
    """Return the profile and completion percentage of the authenticated user."""
    completion = calculate_profile_completion(current_user)
    user_data = UserDetailedProfileResponse.model_validate(current_user)
    user_data.completion_percentage = completion["percentage"]
    return user_data
