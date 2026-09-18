"""
GRAMSAARTHI — Database Initialization & Seeding

This script:
1. Creates all database tables (if they don't exist).
2. Seeds demo data matching the frontend mockData.js values.

Run this once before starting the server:
    cd backend
    python -m app.database.init_db

Or it's called automatically from main.py on startup.
"""

import json
from sqlalchemy.orm import Session

from app.database.connection import engine, SessionLocal, Base

# Import all models so SQLAlchemy knows about them before create_all()
from app.models.user import User
from app.models.business import Business
from app.models.scheme import Scheme
from app.models.assessment import Assessment
from app.models.activity import Activity
from app.models.finance import Finance
from app.models.dpr import DPR
from app.models.document import Document


import os
from sqlalchemy import inspect, text
from app.services.auth_service import hash_password
from app.models.document import DocumentVerificationLog
from app.models.admin_audit import AdminAuditLog
from app.models.notification import Notification

# ── Default GRAMSAARTHI Owner / Administrator Credentials ─────────────────
# Modify administrator credentials here or via environment variables:
ADMIN_DEFAULT_PHONE = os.getenv("GRAMSAARTHI_ADMIN_PHONE", "9999999999")
ADMIN_DEFAULT_EMAIL = os.getenv("GRAMSAARTHI_ADMIN_EMAIL", "admin@gramsaarthi.in")
ADMIN_DEFAULT_PASSWORD = os.getenv("GRAMSAARTHI_ADMIN_PASSWORD")
ADMIN_DEFAULT_NAME = os.getenv("GRAMSAARTHI_ADMIN_NAME", "GRAMSAARTHI Administrator")


def ensure_user_columns():
    """Inspect table 'users' and dynamically add missing columns without dropping data."""
    insp = inspect(engine)
    if "users" not in insp.get_table_names():
        return

    existing_cols = {c["name"] for c in insp.get_columns("users")}

    cols_to_add = {
        "block": "VARCHAR(120) NULL",
        "rural_or_urban": "VARCHAR(60) NULL",
        "age": "INT NULL",
        "gender": "VARCHAR(60) NULL",
        "education": "VARCHAR(100) NULL",
        "occupation": "VARCHAR(120) NULL",
        "social_category": "VARCHAR(60) NULL",
        "annual_family_income": "BIGINT NULL",
        "annual_income_range": "VARCHAR(100) NULL",
        "special_categories": "VARCHAR(255) NULL",
        "business_status": "VARCHAR(100) NULL",
        "business_type": "VARCHAR(120) NULL",
        "business_name": "VARCHAR(150) NULL",
        "years_in_business": "INT NULL",
        "monthly_revenue": "BIGINT NULL",
        "number_of_employees": "INT NULL",
        "business_investment": "BIGINT NULL",
        "interested_business_types": "VARCHAR(255) NULL",
        "investment_capacity": "BIGINT NULL",
        "business_goals": "VARCHAR(255) NULL",
        "skills": "VARCHAR(255) NULL",
        "work_experience": "VARCHAR(255) NULL",
        "has_bank_account": "BOOLEAN NULL",
        "has_land": "BOOLEAN NULL",
        "has_commercial_space": "BOOLEAN NULL",
        "has_equipment": "BOOLEAN NULL",
        "other_relevant_resources": "VARCHAR(255) NULL",
        "desired_opportunities": "VARCHAR(255) NULL",
        "preferred_business_location": "VARCHAR(150) NULL",
        "other_relevant_preferences": "VARCHAR(255) NULL",
        "hashed_password": "VARCHAR(255) NULL",
        "is_active": "BOOLEAN NOT NULL DEFAULT 1",
        "is_admin": "BOOLEAN NOT NULL DEFAULT 0",
        "role": "VARCHAR(30) NOT NULL DEFAULT 'user'",
        "status": "VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'",
        "status_reason": "VARCHAR(500) NULL",
        "blacklist_reason": "VARCHAR(500) NULL",
        "status_updated_at": "DATETIME NULL",
        "status_updated_by": "INT NULL",
    }

    with engine.connect() as conn:
        for col_name, col_type in cols_to_add.items():
            if col_name not in existing_cols:
                try:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"[DB] Added column '{col_name}' to 'users' table.")
                except Exception as e:
                    print(f"[DB] Note adding column {col_name}: {e}")

        # Ensure all existing users have a valid status
        try:
            conn.execute(text("UPDATE users SET status = 'ACTIVE' WHERE status IS NULL OR status = ''"))
            conn.commit()
        except Exception as e:
            print(f"[DB] Note setting default user status: {e}")


def ensure_finance_table():
    """Ensure the 'finances' table exists and has all required columns without data loss."""
    insp = inspect(engine)
    table_names = insp.get_table_names()

    if "finances" not in table_names:
        Finance.__table__.create(bind=engine, checkfirst=True)
        print("[DB] Created 'finances' table.")
        return

    existing_cols = {c["name"] for c in insp.get_columns("finances")}
    cols_to_add = {
        "business_name": "VARCHAR(150) NULL",
        "subsidy_amount": "BIGINT NOT NULL DEFAULT 0",
        "subsidy_percentage": "FLOAT NOT NULL DEFAULT 0.0",
        "matched_scheme_id": "VARCHAR(50) NULL",
        "matched_scheme_name": "VARCHAR(150) NULL",
        "annual_debt_obligation": "BIGINT NOT NULL DEFAULT 0",
        "annual_cfads": "BIGINT NOT NULL DEFAULT 0",
        "status": "VARCHAR(30) NOT NULL DEFAULT 'draft'",
    }

    with engine.connect() as conn:
        for col_name, col_type in cols_to_add.items():
            if col_name not in existing_cols:
                try:
                    conn.execute(text(f"ALTER TABLE finances ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"[DB] Added column '{col_name}' to 'finances' table.")
                except Exception as e:
                    print(f"[DB] Note adding column {col_name} to finances: {e}")


def ensure_dpr_table():
    """Ensure the 'dprs' table exists and has all required columns without data loss."""
    insp = inspect(engine)
    table_names = insp.get_table_names()

    if "dprs" not in table_names:
        DPR.__table__.create(bind=engine, checkfirst=True)
        print("[DB] Created 'dprs' table.")
        return

    existing_cols = {c["name"] for c in insp.get_columns("dprs")}
    cols_to_add = {
        "status": "VARCHAR(30) NOT NULL DEFAULT 'generated'",
        "finance_snapshot_hash": "VARCHAR(64) NULL",
    }

    with engine.connect() as conn:
        for col_name, col_type in cols_to_add.items():
            if col_name not in existing_cols:
                try:
                    conn.execute(text(f"ALTER TABLE dprs ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"[DB] Added column '{col_name}' to 'dprs' table.")
                except Exception as e:
                    print(f"[DB] Note adding column {col_name} to dprs: {e}")


def ensure_document_table():
    """Ensure the 'documents' table exists and has all required columns without data loss."""
    insp = inspect(engine)
    table_names = insp.get_table_names()

    if "documents" not in table_names:
        Document.__table__.create(bind=engine, checkfirst=True)
        print("[DB] Created 'documents' table.")
        return

    existing_cols = {c["name"] for c in insp.get_columns("documents")}
    cols_to_add = {
        "title": "VARCHAR(150) NOT NULL DEFAULT 'Document'",
        "category": "VARCHAR(50) NOT NULL DEFAULT 'Other'",
        "file_name": "VARCHAR(255) NULL",
        "file_type": "VARCHAR(50) NULL",
        "file_size": "BIGINT NULL",
        "storage_path": "VARCHAR(255) NULL",
        "status": "VARCHAR(30) NOT NULL DEFAULT 'Missing'",
        "remarks": "VARCHAR(255) NULL",
        "verification_status": "VARCHAR(30) NOT NULL DEFAULT 'PENDING'",
        "verified_by": "INT NULL",
        "verified_at": "DATETIME NULL",
        "verification_remark": "VARCHAR(500) NULL",
    }

    with engine.connect() as conn:
        for col_name, col_type in cols_to_add.items():
            if col_name not in existing_cols:
                try:
                    conn.execute(text(f"ALTER TABLE documents ADD COLUMN {col_name} {col_type}"))
                    conn.commit()
                    print(f"[DB] Added column '{col_name}' to 'documents' table.")
                except Exception as e:
                    print(f"[DB] Note adding column {col_name} to documents: {e}")


def ensure_verification_logs_table():
    """Ensure 'document_verification_logs' audit table exists without data loss."""
    insp = inspect(engine)
    table_names = insp.get_table_names()
    if "document_verification_logs" not in table_names:
        DocumentVerificationLog.__table__.create(bind=engine, checkfirst=True)
        print("[DB] Created 'document_verification_logs' table.")


def ensure_admin_audit_table():
    """Ensure 'admin_audit_logs' audit table exists without data loss."""
    insp = inspect(engine)
    table_names = insp.get_table_names()
    if "admin_audit_logs" not in table_names:
        AdminAuditLog.__table__.create(bind=engine, checkfirst=True)
        print("[DB] Created 'admin_audit_logs' table.")


def ensure_notifications_table():
    """Ensure 'notifications' table exists without data loss."""
    insp = inspect(engine)
    table_names = insp.get_table_names()
    if "notifications" not in table_names:
        Notification.__table__.create(bind=engine, checkfirst=True)
        print("[DB] Created 'notifications' table.")


def create_tables():
    """Create all tables. Safe to call multiple times (uses IF NOT EXISTS internally)."""
    print("[DB] Creating tables...")
    Base.metadata.create_all(bind=engine)
    ensure_user_columns()
    ensure_finance_table()
    ensure_dpr_table()
    ensure_document_table()
    ensure_verification_logs_table()
    ensure_admin_audit_table()
    ensure_notifications_table()
    print("[DB] Tables ready.")


def seed_data():
    """
    Seed demo data if the database is empty.
    Data sourced from src/data/mockData.js to ensure frontend compatibility.
    Safe to call multiple times — checks for existing data first.
    """
    db: Session = SessionLocal()
    try:
        _seed_user(db)
        _seed_admin(db)
        _seed_businesses(db)
        _seed_schemes(db)
        _seed_activities(db)
        _seed_finance(db)
        _seed_documents(db)
        _seed_notifications(db)
        print("[DB] Seeding complete.")
    finally:
        db.close()




# ── Seed Functions ─────────────────────────────────────────────────────────────

def _seed_user(db: Session):
    """Seed the demo user (Ramesh Kumar from mockData.js)."""
    demo = db.query(User).filter(User.id == 1).first()
    if demo:
        # Ensure password and clean phone is set for existing demo user
        demo.phone = "9876543210"
        if not demo.hashed_password:
            demo.hashed_password = hash_password("demo123")
            demo.age = demo.age or 32
            demo.gender = demo.gender or "Male"
            demo.education = demo.education or "12th Pass"
            demo.occupation = demo.occupation or "Farmer"
            demo.social_category = demo.social_category or "OBC"
            demo.annual_family_income = demo.annual_family_income or 180000
            demo.annual_income_range = demo.annual_income_range or "₹1–2.5 Lakh"
            demo.business_status = demo.business_status or "Planning to start"
            demo.has_bank_account = True
            demo.has_land = True
        db.commit()
        print("[DB] Updated demo user password and profile fields.")
        return

    demo_user = User(
        id=1,
        name="Ramesh Kumar",
        email=None,
        phone="9876543210",
        village="Khajuri Kalan",
        block="Phanda",
        district="Sehore",
        state="Madhya Pradesh",
        rural_or_urban="Rural",
        language="Hindi",
        age=32,
        gender="Male",
        education="12th Pass",
        occupation="Farmer",
        social_category="OBC",
        annual_family_income=180000,
        annual_income_range="₹1–2.5 Lakh",
        business_status="Planning to start",
        business_type="Dairy",
        capital=100000,
        business_investment=100000,
        investment_capacity=100000,
        business_interest="Dairy",
        experience="Beginner",
        skills="Farming, Animal Care",
        has_bank_account=True,
        has_land=True,
        has_commercial_space=False,
        has_equipment=True,
        hashed_password=hash_password("demo123"),
        is_active=True,
    )
    db.add(demo_user)
    db.commit()
    print("[DB] Demo user seeded: Ramesh Kumar")


def _seed_admin(db: Session):
    """
    Seed or update the default GRAMSAARTHI Owner / Administrator user.
    Credentials can be customized at top of this file (lines 35-40) or via environment variables:
    GRAMSAARTHI_ADMIN_PHONE, GRAMSAARTHI_ADMIN_EMAIL, GRAMSAARTHI_ADMIN_PASSWORD.
    """
    admin_user = (
        db.query(User)
        .filter(
            (User.phone == ADMIN_DEFAULT_PHONE) | (User.email == ADMIN_DEFAULT_EMAIL) | (User.role == "admin")
        )
        .first()
    )

    if admin_user:
        admin_user.is_admin = True
        admin_user.role = "admin"
        admin_user.name = ADMIN_DEFAULT_NAME
        admin_user.phone = ADMIN_DEFAULT_PHONE
        admin_user.email = ADMIN_DEFAULT_EMAIL
        admin_user.hashed_password = hash_password(ADMIN_DEFAULT_PASSWORD)
        db.commit()
        print(f"[DB] Verified and updated administrator account: {admin_user.email or admin_user.phone}")
        return

    admin = User(
        name=ADMIN_DEFAULT_NAME,
        phone=ADMIN_DEFAULT_PHONE,
        email=ADMIN_DEFAULT_EMAIL,
        language="English",
        state="Madhya Pradesh",
        district="Bhopal",
        hashed_password=hash_password(ADMIN_DEFAULT_PASSWORD),
        is_active=True,
        is_admin=True,
        role="admin",
    )
    db.add(admin)
    db.commit()
    print(f"[DB] Seeded GRAMSAARTHI Administrator: {ADMIN_DEFAULT_PHONE} / {ADMIN_DEFAULT_EMAIL}")



def _seed_businesses(db: Session):
    """
    Seed business ideas from BUSINESS_IDEAS in mockData.js.
    Converts human-readable labels to numeric ranges for future ML use.
    """
    if db.query(Business).count() > 0:
        print("[DB] Businesses already seeded. Skipping.")
        return

    businesses = [
        Business(
            name="Dairy Farm", category="Dairy", emoji="🐄",
            investment_min=800000, investment_max=1200000,
            profit_min=40000, profit_max=60000,
            investment_label="₹8–12 Lakh", profit_label="₹40–60K/month",
            demand="High", competition="Medium", risk="Medium", score=84,
        ),
        Business(
            name="Poultry Farm", category="Poultry", emoji="🐔",
            investment_min=500000, investment_max=800000,
            profit_min=30000, profit_max=45000,
            investment_label="₹5–8 Lakh", profit_label="₹30–45K/month",
            demand="High", competition="Medium-High", risk="Medium", score=79,
        ),
        Business(
            name="Vegetable Retail", category="Retail", emoji="🥦",
            investment_min=100000, investment_max=200000,
            profit_min=15000, profit_max=25000,
            investment_label="₹1–2 Lakh", profit_label="₹15–25K/month",
            demand="Very High", competition="High", risk="Low", score=76,
        ),
        Business(
            name="Flour Mill", category="Agriculture", emoji="🌾",
            investment_min=300000, investment_max=500000,
            profit_min=20000, profit_max=35000,
            investment_label="₹3–5 Lakh", profit_label="₹20–35K/month",
            demand="High", competition="Low", risk="Low", score=81,
        ),
        Business(
            name="Tailoring Unit", category="Textile", emoji="🧵",
            investment_min=100000, investment_max=300000,
            profit_min=12000, profit_max=20000,
            investment_label="₹1–3 Lakh", profit_label="₹12–20K/month",
            demand="Medium", competition="Medium", risk="Low", score=72,
        ),
        Business(
            name="Agri Input Store", category="Agriculture", emoji="🌱",
            investment_min=200000, investment_max=400000,
            profit_min=18000, profit_max=30000,
            investment_label="₹2–4 Lakh", profit_label="₹18–30K/month",
            demand="High", competition="Low-Medium", risk="Low", score=80,
        ),
        Business(
            name="Transport / Mini-Truck", category="Transport", emoji="🚛",
            investment_min=600000, investment_max=1000000,
            profit_min=35000, profit_max=55000,
            investment_label="₹6–10 Lakh", profit_label="₹35–55K/month",
            demand="High", competition="Low", risk="Medium", score=77,
        ),
        Business(
            name="Cold Storage", category="Agriculture", emoji="❄️",
            investment_min=1500000, investment_max=2500000,
            profit_min=80000, profit_max=120000,
            investment_label="₹15–25 Lakh", profit_label="₹80–120K/month",
            demand="Very High", competition="Very Low", risk="Medium-High", score=88,
        ),
    ]

    db.add_all(businesses)
    db.commit()
    print(f"[DB] Seeded {len(businesses)} business ideas.")


def _seed_schemes(db: Session):
    """Seed government schemes from SCHEMES in mockData.js."""
    if db.query(Scheme).count() > 0:
        print("[DB] Schemes already seeded. Skipping.")
        return

    schemes = [
        Scheme(
            name="PM Mudra Yojana – Tarun",
            category="Micro Enterprise",
            loan_amount=1000000,
            loan_amount_label="₹10 Lakh",
            interest_rate=8.0,
            interest_label="7% – 9% p.a.",
            tenure=60,
            tenure_label="5 years",
            who="Non-corporate, non-farm small/micro enterprises",
            benefit="Up to ₹10 lakh collateral-free loan for micro businesses",
            tag="Best Match",
            tag_color="green",
            docs=json.dumps(["Aadhaar Card", "PAN Card", "Bank Statement (6 months)", "Business Plan", "Quotation for Equipment"]),
            eligibility=json.dumps(["Indian citizen", "Age 18–65", "Business plan ready", "No default on existing loans"]),
            official_url="https://www.mudra.org.in/",
            default_match=92,
        ),
        Scheme(
            name="NABARD Dairy Entrepreneurship Development Scheme",
            category="Agriculture / Dairy",
            loan_amount=700000,
            loan_amount_label="₹7 Lakh",
            interest_rate=6.5,
            interest_label="6.5% p.a.",
            tenure=72,
            tenure_label="6 years",
            who="Farmers, individual entrepreneurs, NGOs, companies",
            benefit="Capital subsidy 25% (33.33% for SC/ST), back-ended subsidy",
            tag="Recommended",
            tag_color="blue",
            docs=json.dumps(["Aadhaar", "Land Records", "Bank Account", "Project Report"]),
            eligibility=json.dumps(["Rural area", "Cattle ownership or lease", "No existing dairy scheme benefit"]),
            official_url="https://www.nabard.org/",
            default_match=87,
        ),
        Scheme(
            name="Stand-Up India",
            category="SC/ST & Women",
            loan_amount=10000000,
            loan_amount_label="₹1 Crore",
            interest_rate=8.0,
            interest_label="8% p.a.",
            tenure=84,
            tenure_label="7 years",
            who="SC/ST or Women entrepreneurs for greenfield projects",
            benefit="Composite loan between ₹10 lakh–₹1 crore",
            tag="Eligible",
            tag_color="gray",
            docs=json.dumps(["Aadhaar", "PAN", "Project Report", "Caste Certificate (if applicable)"]),
            eligibility=json.dumps(["SC/ST or woman entrepreneur", "Age 18+", "Greenfield enterprise only"]),
            official_url="https://www.standupmitra.in/",
            default_match=71,
        ),
    ]

    db.add_all(schemes)
    db.commit()
    print(f"[DB] Seeded {len(schemes)} government schemes.")


def _seed_activities(db: Session):
    """Seed recent activity history from RECENT_ACTIVITIES in mockData.js."""
    if db.query(Activity).count() > 0:
        print("[DB] Activities already seeded. Skipping.")
        return

    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)

    activities = [
        Activity(user_id=1, activity_type="assessment", title="Business assessment completed for Dairy Farm",
                 description="Location: Khajuri Kalan | Capital: ₹1,00,000", icon="📊",
                 created_at=now - timedelta(hours=2)),
        Activity(user_id=1, activity_type="scheme", title="PM Mudra Tarun scheme eligibility checked",
                 description="Match score: 92%", icon="🏛️",
                 created_at=now - timedelta(days=1)),
        Activity(user_id=1, activity_type="dpr", title="DPR draft saved – 72% complete",
                 description="Dairy Farm – Khajuri Kalan", icon="📄",
                 created_at=now - timedelta(days=2)),
        Activity(user_id=1, activity_type="loan", title="Loan eligibility calculated: ₹9,00,000",
                 description="PM Mudra Yojana – Tarun | EMI: ₹17,822/month", icon="💰",
                 created_at=now - timedelta(days=3)),
    ]

    db.add_all(activities)
    db.commit()
    print(f"[DB] Seeded {len(activities)} activity records.")


def _seed_finance(db: Session):
    """Seed initial finance plan for demo user 1 (Dairy Farm) if not present."""
    from app.models.finance import Finance
    from app.services import finance_service

    if db.query(Finance).filter(Finance.user_id == 1).first():
        print("[DB] Demo finance already seeded. Skipping.")
        return

    demo_user = db.query(User).filter(User.id == 1).first()
    if not demo_user:
        return

    try:
        plan = finance_service.calculate_financial_plan(
            business_type="Dairy",
            user_capital=100000,
            user_profile=demo_user,
            status="draft",
        )
        finance_service.save_or_update_user_finance(
            db=db,
            user_id=1,
            data=plan,
            status="draft",
        )
        print("[DB] Seeded finance plan for demo user 1 (Dairy Farm).")
    except Exception as exc:
        print(f"[DB] Note seeding finance for demo user: {exc}")


def _seed_documents(db: Session):
    """Seed initial document checklist items for demo user 1 if not present."""
    if db.query(Document).filter(Document.user_id == 1).first():
        return

    demo_user = db.query(User).filter(User.id == 1).first()
    if not demo_user:
        return

    default_docs = [
        {"title": "Aadhaar Card", "category": "Identity", "status": "Missing"},
        {"title": "PAN Card", "category": "Identity", "status": "Missing"},
        {"title": "Bank Statement (Last 6 Months)", "category": "Financial", "status": "Missing"},
        {"title": "Detailed Project Report (DPR)", "category": "DPR", "status": "Missing"},
        {"title": "Business Premises / Land Records", "category": "Business", "status": "Missing"},
        {"title": "Machinery / Equipment Quotation", "category": "Loan", "status": "Missing"},
        {"title": "Scheme Application Form", "category": "Government Scheme", "status": "Missing"},
    ]

    docs = [
        Document(
            user_id=1,
            title=item["title"],
            category=item["category"],
            status=item["status"],
            remarks=None,
        )
        for item in default_docs
    ]
    db.add_all(docs)
    db.commit()
    print(f"[DB] Seeded {len(docs)} document checklist items for demo user 1.")


def _seed_notifications(db: Session):
    """Seed initial notifications for demo user 1 if not present."""
    if db.query(Notification).count() > 0:
        print("[DB] Notifications already seeded. Skipping.")
        return

    from datetime import datetime, timedelta, timezone
    now = datetime.now(timezone.utc)

    notifications = [
        Notification(
            user_id=1,
            title="DPR Ready for Final Signature",
            message="Your Detailed Project Report for Dairy Farm is 100% prepared and ready for bank submission.",
            type="dpr",
            link="/dpr",
            is_read=False,
            created_at=now - timedelta(hours=2),
        ),
        Notification(
            user_id=1,
            title="Mudra Yojana Application Submitted",
            message="Your PM Mudra Tarun application (₹9,00,000) was submitted and is currently under bank review.",
            type="scheme",
            link="/applications",
            is_read=False,
            created_at=now - timedelta(days=1),
        ),
        Notification(
            user_id=1,
            title="Aadhaar Card Verified",
            message="Your Aadhaar Card document has been verified by the GRAMSAARTHI Administrator.",
            type="document",
            link="/documents",
            is_read=False,
            created_at=now - timedelta(days=2),
        ),
        Notification(
            user_id=1,
            title="Welcome to GRAMSAARTHI",
            message="Explore tailored rural business recommendations, government subsidies, and financial viability reports.",
            type="system",
            link="/business",
            is_read=True,
            created_at=now - timedelta(days=5),
            read_at=now - timedelta(days=4),
        ),
    ]

    db.add_all(notifications)
    db.commit()
    print(f"[DB] Seeded {len(notifications)} initial notification records.")


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("[DB] Initializing GRAMSAARTHI database...")
    create_tables()
    seed_data()
    print("[DB] Done! You can now start the server with: uvicorn app.main:app --reload")
