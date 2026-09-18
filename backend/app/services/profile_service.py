"""
GRAMSAARTHI — Progressive Profile Service
Calculates profile completion percentage, detects intent-specific missing profile fields,
and extracts/updates user profile entities from conversational text.
"""

import re
import logging
from sqlalchemy.orm import Session
from app.models.user import User

logger = logging.getLogger(__name__)


# ── Profile Completion Scoring ────────────────────────────────────────────────

def calculate_profile_completion(user: User | None) -> dict:
    """
    Calculate profile completion percentage based on meaningful fields:
    - Basic Information (25%)
    - Personal Information (25%)
    - Eligibility Information (20%)
    - Business Profile & Interests (20%)
    - Skills & Resources (10%)
    Total = 100%
    """
    if not user:
        return {
            "percentage": 0,
            "completed_fields": [],
            "missing_fields": [],
            "message": "Complete your profile to get more personalized government schemes and business recommendations.",
        }

    score = 0
    completed = []
    missing = []

    # 1. Basic Information (25%)
    if user.name:
        score += 5
        completed.append({"key": "full_name", "label": "Full Name", "value": user.name})
    else:
        missing.append({"key": "full_name", "label": "Full Name", "category": "basic", "icon": "👤"})

    if user.phone:
        score += 5
        completed.append({"key": "mobile_number", "label": "Mobile Number", "value": user.phone})
    else:
        missing.append({"key": "mobile_number", "label": "Mobile Number", "category": "basic", "icon": "📱"})

    if user.language:
        score += 5
        completed.append({"key": "preferred_language", "label": "Preferred Language", "value": user.language})
    else:
        missing.append({"key": "preferred_language", "label": "Preferred Language", "category": "basic", "icon": "🌐"})

    if user.state:
        score += 5
        completed.append({"key": "state", "label": "State", "value": user.state})
    else:
        missing.append({"key": "state", "label": "State", "category": "location", "icon": "📍"})

    if user.district:
        score += 5
        completed.append({"key": "district", "label": "District", "value": user.district})
    else:
        missing.append({"key": "district", "label": "District", "category": "location", "icon": "🏙️"})

    # 2. Personal Information (25%)
    if user.age:
        score += 5
        completed.append({"key": "age", "label": "Age", "value": f"{user.age} years"})
    else:
        missing.append({"key": "age", "label": "Age", "category": "personal", "icon": "🎂"})

    if user.gender:
        score += 5
        completed.append({"key": "gender", "label": "Gender", "value": user.gender})
    else:
        missing.append({"key": "gender", "label": "Gender", "category": "personal", "icon": "👥"})

    if user.education:
        score += 5
        completed.append({"key": "education", "label": "Education Level", "value": user.education})
    else:
        missing.append({"key": "education", "label": "Education", "category": "personal", "icon": "🎓"})

    if user.occupation:
        score += 10
        completed.append({"key": "occupation", "label": "Occupation", "value": user.occupation})
    else:
        missing.append({"key": "occupation", "label": "Occupation", "category": "personal", "icon": "💼"})

    # 3. Eligibility Information (20%)
    if user.social_category:
        score += 5
        completed.append({"key": "social_category", "label": "Social Category", "value": user.social_category})
    else:
        missing.append({"key": "social_category", "label": "Social Category", "category": "eligibility", "icon": "🏛️"})

    if user.annual_family_income or user.annual_income_range:
        score += 10
        inc_val = f"₹{user.annual_family_income:,}" if user.annual_family_income else user.annual_income_range
        completed.append({"key": "annual_family_income", "label": "Family Income", "value": inc_val})
    else:
        missing.append({"key": "annual_family_income", "label": "Annual Family Income", "category": "eligibility", "icon": "💰"})

    if user.special_categories:
        score += 5
        completed.append({"key": "special_categories", "label": "Special Category", "value": user.special_categories})
    else:
        missing.append({"key": "special_categories", "label": "Special Category", "category": "eligibility", "icon": "⭐"})

    # 4. Business Profile & Interests (20%)
    if user.business_status:
        score += 5
        completed.append({"key": "business_status", "label": "Business Status", "value": user.business_status})
    else:
        missing.append({"key": "business_status", "label": "Business Status", "category": "business", "icon": "🏬"})

    if user.business_type or user.business_interest or user.interested_business_types:
        score += 5
        b_val = user.business_type or user.business_interest or user.interested_business_types
        completed.append({"key": "business_interests", "label": "Business Interest", "value": b_val})
    else:
        missing.append({"key": "business_interests", "label": "Business Interest", "category": "business", "icon": "💡"})

    if user.investment_capacity or user.capital:
        score += 10
        cap_val = f"₹{(user.investment_capacity or user.capital):,}"
        completed.append({"key": "investment_capacity", "label": "Investment Capacity", "value": cap_val})
    else:
        missing.append({"key": "investment_capacity", "label": "Investment Capacity", "category": "business", "icon": "🪙"})

    # 5. Skills & Resources (10%)
    if user.skills or user.work_experience or user.experience:
        score += 5
        sk_val = user.skills or user.work_experience or user.experience
        completed.append({"key": "skills", "label": "Skills & Experience", "value": sk_val})
    else:
        missing.append({"key": "skills", "label": "Skills / Experience", "category": "skills", "icon": "🛠️"})

    has_any_resource = (
        user.has_bank_account is True
        or user.has_land is True
        or user.has_commercial_space is True
        or user.has_equipment is True
        or bool(user.other_relevant_resources)
    )
    if has_any_resource:
        score += 5
        res_list = []
        if user.has_bank_account: res_list.append("Bank Account")
        if user.has_land: res_list.append("Land")
        if user.has_commercial_space: res_list.append("Shop / Space")
        if user.has_equipment: res_list.append("Equipment")
        if user.other_relevant_resources: res_list.append(user.other_relevant_resources)
        completed.append({"key": "resources", "label": "Resources", "value": ", ".join(res_list)})
    else:
        missing.append({"key": "resources", "label": "Resources (Land, Shop, etc.)", "category": "resources", "icon": "🏡"})

    final_pct = min(100, max(0, score))

    return {
        "percentage": final_pct,
        "completed_fields": completed,
        "missing_fields": missing,
        "message": "Complete your profile to get more personalized government schemes and business recommendations.",
    }


# ── Intelligent Missing-Data Handling ──────────────────────────────────────────

def get_missing_profile_fields(user: User | None, intent: str) -> list[str]:
    """
    Determine which required profile fields are missing based on the user's intent.
    Only asks for fields strictly necessary for the query.
    """
    if not user:
        return []

    missing = []

    if intent == "SCHEME":
        if not user.occupation:
            missing.append("occupation")
        if not user.annual_family_income and not user.annual_income_range:
            missing.append("annual_family_income")
        if not user.age:
            missing.append("age")
        if not user.social_category:
            missing.append("social_category")

    elif intent == "BUSINESS":
        if not user.capital and not user.investment_capacity:
            missing.append("investment_capacity")
        if not user.business_interest and not user.business_type:
            missing.append("business_interest")

    elif intent == "BUSINESS_AND_SCHEME":
        if not user.business_interest and not user.business_type:
            missing.append("business_interest")
        if not user.capital and not user.investment_capacity:
            missing.append("investment_capacity")
        if not user.occupation:
            missing.append("occupation")
        if not user.annual_family_income and not user.annual_income_range:
            missing.append("annual_family_income")

    return missing


# ── Entity Extraction & Automatic Profile Update ──────────────────────────────

def extract_and_update_profile_from_text(
    db: Session,
    user: User,
    text: str,
    intent: str,
) -> dict:
    """
    Extract profile fields (occupation, income, capital, social category, etc.)
    provided in user's conversational message and persist them directly to MySQL.
    Returns a dict of newly updated fields.
    """
    updates = {}
    q = text.lower()

    # 1. Occupation Extraction
    if not user.occupation or intent == "SCHEME":
        if any(w in q for w in ["farmer", "farming", "agriculture", "किसान", "खेती", "कृषि", "ખેડૂત"]):
            updates["occupation"] = "Farmer"
        elif any(w in q for w in ["artisan", "tailor", "tailoring", "weaver", "दर्जी", "सिलाई", "कारीगर", "દરજી"]):
            updates["occupation"] = "Artisan / Tailor"
        elif any(w in q for w in ["shopkeeper", "retailer", "kirana", "store owner", "दुकानदार", "किराना", "દુકાનદાર"]):
            updates["occupation"] = "Shopkeeper / Retailer"
        elif any(w in q for w in ["daily wage", "labor", "labourer", "मजदूर", "श्रमिक", "મજૂર"]):
            updates["occupation"] = "Daily Wage Worker"
        elif any(w in q for w in ["self employed", "own business", "स्वरोजगार", "સ્વરોજગાર"]):
            updates["occupation"] = "Self Employed"
        elif any(w in q for w in ["homemaker", "housewife", "गृहणी", "ગૃહિણી"]):
            updates["occupation"] = "Homemaker"
        elif any(w in q for w in ["student", "छात्र", "विद्यार्थी"]):
            updates["occupation"] = "Student"

    # 2. Capital / Investment Extraction
    if not user.capital and not user.investment_capacity or intent in ("BUSINESS", "BUSINESS_AND_SCHEME"):
        from app.services.advisor_service import extract_capital_mention
        amt = extract_capital_mention(text)
        if amt:
            updates["capital"] = amt
            updates["investment_capacity"] = amt
            updates["business_investment"] = amt

    # 3. Annual Family Income Extraction
    if not user.annual_family_income or intent == "SCHEME":
        if any(w in q for w in ["income", "annual income", "salary", "कमाई", "पारिवारिक आय", "આવક", "family income"]):
            m_inc = re.search(r'(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac|लाख|લાખ)', q)
            if m_inc:
                try:
                    inc = int(float(m_inc.group(1)) * 100000)
                    updates["annual_family_income"] = inc
                    if inc < 100000:
                        updates["annual_income_range"] = "Below ₹1 Lakh"
                    elif inc <= 250000:
                        updates["annual_income_range"] = "₹1–2.5 Lakh"
                    elif inc <= 500000:
                        updates["annual_income_range"] = "₹2.5–5 Lakh"
                    else:
                        updates["annual_income_range"] = "Above ₹5 Lakh"
                except ValueError:
                    pass
        # Direct range phrases
        if "below 1 lakh" in q or "1 लाख से कम" in q or "૧ લાખથી ઓછી" in q:
            updates["annual_family_income"] = 80000
            updates["annual_income_range"] = "Below ₹1 Lakh"
        elif "1 to 2.5" in q or "1-2.5" in q or "१ से २.५" in q or "૧ થી ૨.૫" in q:
            updates["annual_family_income"] = 180000
            updates["annual_income_range"] = "₹1–2.5 Lakh"
        elif "2.5 to 5" in q or "2.5-5" in q or "२.५ से ५" in q or "૨.૫ થી ૫" in q:
            updates["annual_family_income"] = 350000
            updates["annual_income_range"] = "₹2.5–5 Lakh"

    # 4. Social Category Extraction
    if not user.social_category:
        if "obc" in q or "ओबीसी" in q:
            updates["social_category"] = "OBC"
        elif "sc" in q or "अनुसूचित जाति" in q:
            updates["social_category"] = "SC"
        elif "st" in q or "अनुसूचित जनजाति" in q:
            updates["social_category"] = "ST"
        elif "general" in q or "सामान्य" in q:
            updates["social_category"] = "General"

    # 5. Age Extraction
    if not user.age:
        m_age = re.search(r'\b(?:age|उम्र|वय)\s*[:=]?\s*(\d{2})\b|\b(\d{2})\s*(?:years?|साल|वर्ष)\b', q)
        if m_age:
            try:
                age_val = int(m_age.group(1) or m_age.group(2))
                if 18 <= age_val <= 80:
                    updates["age"] = age_val
            except ValueError:
                pass

    # 6. Business Interest Extraction
    if not user.business_interest or intent in ("BUSINESS", "BUSINESS_AND_SCHEME"):
        from app.services.advisor_service import extract_business_mentions
        detected_biz = extract_business_mentions(text)
        if detected_biz:
            updates["business_interest"] = detected_biz[0]
            updates["business_type"] = detected_biz[0]

    # Commit any extracted updates to the database
    if updates:
        for k, v in updates.items():
            setattr(user, k, v)
        try:
            db.commit()
            db.refresh(user)
            logger.info("[PROFILE] Automatically updated user %s fields from chat: %s", user.id, updates)
        except Exception as exc:
            db.rollback()
            logger.error("[PROFILE] Failed to save extracted profile fields: %s", exc)

    return updates
