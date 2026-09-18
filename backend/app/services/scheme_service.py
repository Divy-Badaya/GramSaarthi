"""
GRAMSAARTHI — Scheme Service
Handles government scheme recommendation, rule-based matching,
and eligibility evaluation based on the official 10-scheme dataset.
"""

import csv
import os
from pathlib import Path
from typing import Any

from app.schemas.scheme import (
    SchemeRecommendation,
    UserAssessmentProfile,
    EligibilityEvaluateResponse,
)

# Path to the official dataset
CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "government_schemes.csv"

# In-memory scheme storage
_SCHEMES_CACHE: list[dict[str, Any]] = []

# Presentation details & metadata for the 10 official schemes
SCHEME_METADATA = {
    "PMMY": {
        "short_description": "Collateral-free institutional credit up to ₹20 Lakh for micro and small enterprises.",
        "max_loan": "Up to ₹20 Lakh",
        "interest_rate": "7% – 10% p.a.",
        "subsidy": "Collateral-free + Mudra credit guarantee",
        "tenure": "3 to 5 years",
        "tag": "Central Scheme",
        "tag_color": "blue",
        "who": "Non-corporate, non-farm small/micro enterprises in rural & semi-urban areas",
        "benefit": "Working capital & equipment finance across Shishu (up to ₹50K), Kishore (₹50K–₹5L), Tarun (₹5L–₹10L), and Tarun Plus (₹10L–₹20L).",
        "docs": ["Aadhaar Card", "PAN Card", "Business Plan / Quotation", "Bank Statement (6 months)", "Proof of Business Address"],
    },
    "PMEGP": {
        "short_description": "Credit-linked subsidy program for setting up new micro-enterprises and generating rural employment.",
        "max_loan": "Up to ₹50 Lakh (Mfg) / ₹20 Lakh (Service)",
        "interest_rate": "Normal bank rate (~8.5% p.a.)",
        "subsidy": "15% to 35% margin money subsidy (higher for rural/SC/ST/women)",
        "tenure": "3 to 7 years",
        "tag": "Central Scheme",
        "tag_color": "green",
        "who": "Individuals aged 18+ setting up new micro-enterprises",
        "benefit": "Substantial government margin money subsidy up to 35% of project cost for rural beneficiaries.",
        "docs": ["Aadhaar Card", "Educational Certificate (Class 8+ for larger projects)", "Project Report (DPR)", "Caste/Special Category Certificate (if applicable)", "Rural Area Certificate"],
    },
    "PMVISHWAKARMA": {
        "short_description": "Holistic support, training, toolkit incentive, and collateral-free credit for traditional artisans and craftspeople.",
        "max_loan": "Up to ₹3 Lakh (Tranche 1: ₹1L, Tranche 2: ₹2L)",
        "interest_rate": "Concessional 5% p.a. (subvented by GoI)",
        "subsidy": "₹15,000 digital toolkit incentive + ₹500/day skill training stipend",
        "tenure": "18 to 30 months",
        "tag": "Central Scheme",
        "tag_color": "gold",
        "who": "Artisans and craftspeople working with hands and tools in 18 traditional trades",
        "benefit": "PM Vishwakarma Certificate & ID, basic skill training, ₹15,000 e-voucher for modern tools, and collateral-free loan at 5%.",
        "docs": ["Aadhaar Card", "Mobile Linked with Aadhaar", "Bank Account Details", "Ration Card / Family Proof", "Self-declaration of traditional trade"],
    },
    "KCC": {
        "short_description": "Adequate and timely credit support for agriculture, dairy, animal husbandry, poultry, and fisheries.",
        "max_loan": "Up to ₹3 Lakh (Collateral-free up to ₹1.6 Lakh)",
        "interest_rate": "Effective 4% p.a. with prompt repayment subvention",
        "subsidy": "2% interest subvention + 3% prompt repayment incentive",
        "tenure": "1 to 5 years (revolving credit)",
        "tag": "Central Scheme",
        "tag_color": "green",
        "who": "Owner cultivators, tenant farmers, dairy farmers, poultry keepers, fishers, and SHGs/JLGs",
        "benefit": "Single-window flexible working capital card with low 4% effective interest for farm crops, livestock maintenance, and fodder.",
        "docs": ["Land Ownership / Tenancy Records", "Aadhaar Card", "PAN Card", "Livestock / Animal count declaration", "Passport Photo"],
    },
    "PMFME": {
        "short_description": "Credit-linked capital subsidy to upgrade and formalize micro food processing enterprises under One District One Product (ODOP).",
        "max_loan": "Up to ₹10 Lakh credit-linked subsidy",
        "interest_rate": "Bank lending rate",
        "subsidy": "35% credit-linked capital subsidy (max ₹10 Lakh per unit)",
        "tenure": "3 to 7 years",
        "tag": "Central + State",
        "tag_color": "orange",
        "who": "Existing or new micro food processing entrepreneurs, FPOs, SHGs, and cooperatives",
        "benefit": "35% direct financial subsidy on eligible project cost, branding & marketing support, and food safety training.",
        "docs": ["Aadhaar Card", "Educational Proof (Class 8+)", "DPR / Food Project Report", "FSSAI Registration (or intent to register)", "Bank Account & Land/Premises Proof"],
    },
    "STANDUP_INDIA": {
        "short_description": "Bank loans between ₹10 Lakh and ₹1 Crore to Scheduled Caste (SC), Scheduled Tribe (ST), and Women borrowers for greenfield ventures.",
        "max_loan": "₹10 Lakh to ₹1 Crore",
        "interest_rate": "Lowest applicable bank rate (Base rate + MCLR)",
        "subsidy": "Composite loan covering up to 85% of project cost with Credit Guarantee Fund",
        "tenure": "Up to 7 years (with up to 18 months moratorium)",
        "tag": "Central Scheme",
        "tag_color": "purple",
        "who": "SC, ST, or Women entrepreneurs establishing new (greenfield) enterprises",
        "benefit": "High-value composite loan covering equipment and working capital with guidance through Stand-Up Mitra portal.",
        "docs": ["Identity & Address Proof", "Caste Certificate (for SC/ST) or Women Promoter Proof (51%+ stake)", "Project Report (DPR)", "Pollution / License clearances", "Bank Statement"],
    },
    "PMKUSUM": {
        "short_description": "Subsidized solar water pumps and grid-connected renewable solar power plants for agricultural energy independence.",
        "max_loan": "Covers up to 90% project cost (subsidy + loan)",
        "interest_rate": "Commercial / NABARD refinance rate",
        "subsidy": "Up to 60% total subsidy (30% Central + 30% State)",
        "tenure": "5 to 10 years",
        "tag": "Central + State",
        "tag_color": "blue",
        "who": "Individual farmers, farmer groups, cooperatives, Panchayats, FPOs, and Water User Associations",
        "benefit": "Replaces expensive diesel pumps with solar pumps, saving electricity bills and enabling sale of surplus power to the grid.",
        "docs": ["Farmer Land Record (Khasra/Khatauni)", "Aadhaar Card", "Bank Account Details", "Electricity Connection / Substation Distance Certificate", "Passport Photo"],
    },
    "NLM": {
        "short_description": "Capital subsidy for entrepreneurship in rural poultry, sheep, goat, piggery, and animal feed/fodder infrastructure.",
        "max_loan": "Project-based (up to ₹1 Crore project cost)",
        "interest_rate": "Bank lending rate",
        "subsidy": "50% capital subsidy (up to ₹25 Lakh to ₹50 Lakh per unit)",
        "tenure": "5 to 8 years",
        "tag": "Central + State",
        "tag_color": "orange",
        "who": "Individuals, SHGs, FPOs, Section 8 companies in livestock & poultry",
        "benefit": "Direct 50% back-ended capital subsidy released in two tranches through SIDBI for parent farms, hatcheries, and feed plants.",
        "docs": ["Detailed Project Report (DPR)", "Land Ownership or 10-year Lease Deed", "Training Certificate in Animal Husbandry / Poultry", "Aadhaar & PAN", "Bank Loan Sanction Letter"],
    },
    "PMMSY": {
        "short_description": "Comprehensive development and financial assistance for fishers, fish farmers, biofloc, RAS, and aquaculture infrastructure.",
        "max_loan": "Activity-based (up to ₹25–50 Lakh per project)",
        "interest_rate": "Normal bank lending rate",
        "subsidy": "40% for General Category; 60% for SC/ST/Women beneficiaries",
        "tenure": "3 to 7 years",
        "tag": "Central + State",
        "tag_color": "cyan",
        "who": "Fishers, fish farmers, fisheries SHGs, JLGs, and aquaculture entrepreneurs",
        "benefit": "Major capital subsidy (40%–60%) for pond construction, biofloc units, fish feed mills, and refrigerated transport vehicles.",
        "docs": ["Fisherman / Aquaculture ID or Land/Pond Waterbody Lease", "Aadhaar Card", "DPR for Fisheries Activity", "Bank Passbook", "Caste / Category Certificate (if applicable)"],
    },
    "PMFBY": {
        "short_description": "Comprehensive insurance coverage against non-preventable natural crop damage, drought, flood, and post-harvest losses.",
        "max_loan": "Full sum insured proportional to crop scale of finance",
        "interest_rate": "N/A (Insurance Coverage)",
        "subsidy": "Farmers pay only 2% for Kharif, 1.5% for Rabi, and 5% for Annual Commercial/Horticultural crops",
        "tenure": "Single crop season (seasonal renewal)",
        "tag": "Central + State",
        "tag_color": "green",
        "who": "All farmers including sharecroppers and tenant farmers growing notified crops in notified areas",
        "benefit": "Complete yield and loss insurance with claim settlement credited directly into farmer bank accounts via National Crop Insurance Portal.",
        "docs": ["Land Possession Certificate / Patta / Tenancy Agreement", "Crop Sowing Certificate / Declaration", "Aadhaar Card", "Bank Account Details (linked to Aadhaar)"],
    },
}


def _load_csv() -> list[dict[str, Any]]:
    """Load the 10 official government schemes from the CSV dataset."""
    global _SCHEMES_CACHE
    if _SCHEMES_CACHE:
        return _SCHEMES_CACHE

    schemes = []
    if not CSV_PATH.exists():
        return schemes

    with open(CSV_PATH, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            s_id = row.get("scheme_id", "").strip()
            categories = [c.strip() for c in row.get("categories", "").split(";") if c.strip()]
            business_categories = [
                b.strip() for b in row.get("business_categories", "").split(";") if b.strip()
            ]
            questions = [
                q.strip() for q in row.get("eligibility_questions", "").split(";") if q.strip()
            ]

            meta = SCHEME_METADATA.get(s_id, {})

            scheme_obj = {
                "scheme_id": s_id,
                "scheme_name": row.get("scheme_name", "").strip(),
                "government_level": row.get("government_level", "").strip(),
                "categories": categories,
                "business_categories": business_categories,
                "eligibility_criteria": row.get("eligibility_criteria", "").strip(),
                "eligibility_questions": questions,
                "source_url": row.get("source_url", "").strip(),
                "application_url": row.get("application_url", "").strip(),
                # Presentation & metadata
                "short_description": meta.get("short_description", row.get("eligibility_criteria", "")[:120] + "..."),
                "max_loan": meta.get("max_loan", "Varies by project"),
                "interest_rate": meta.get("interest_rate", "Standard bank rate"),
                "subsidy": meta.get("subsidy", "Available under government guidelines"),
                "tenure": meta.get("tenure", "3 to 5 years"),
                "tag": meta.get("tag", row.get("government_level", "Government Scheme")),
                "tag_color": meta.get("tag_color", "blue"),
                "who": meta.get("who", "Eligible rural & semi-urban entrepreneurs"),
                "benefit": meta.get("benefit", "Financial and operational assistance under official guidelines."),
                "docs": meta.get("docs", ["Aadhaar Card", "PAN Card", "Project Report", "Bank Statement"]),
            }
            schemes.append(scheme_obj)

    _SCHEMES_CACHE = schemes
    return _SCHEMES_CACHE


def get_all_schemes() -> list[dict[str, Any]]:
    """Return all 10 official schemes from the dataset."""
    return _load_csv()


def get_scheme_by_id(scheme_id: str) -> dict[str, Any] | None:
    """Return a single scheme by scheme_id (case-insensitive)."""
    schemes = _load_csv()
    target = scheme_id.strip().upper()
    for s in schemes:
        if s["scheme_id"].upper() == target:
            return s
    return None


def _generate_localized_relevance_reason(scheme_id: str, user_biz: str, location_str: str, lang: str = "en") -> str:
    s_id = (scheme_id or "").upper()
    biz = user_biz or ""

    if lang == "hi":
        biz_map = {
            "dairy": "डेयरी", "poultry": "कुक्कुट पालन", "fisheries": "मत्स्य पालन",
            "agriculture": "कृषि", "food": "खाद्य प्रसंस्करण", "retail": "खुदरा दुकान"
        }
        hi_biz = biz_map.get(biz.lower(), biz or "ग्रामीण")
        loc_str = f" {location_str} में लागू।" if location_str else ""
        if s_id == "KCC":
            return f"आपके '{hi_biz}' उद्यम के लिए सीधे उपयुक्त; सस्ती 4% ब्याज दर पर कार्यशील पूंजी ऋण।{loc_str}"
        elif s_id == "PMEGP":
            return f"आपके नए '{hi_biz}' उद्यम के लिए 25%–35% ग्रामीण मार्जिन मनी सरकारी सब्सिडी।{loc_str}"
        elif s_id == "PMMY":
            return f"आपके '{hi_biz}' व्यवसाय के लिए बिना किसी गारंटी ₹20 लाख तक का कार्यशील पूंजी और उपकरण ऋण।{loc_str}"
        elif s_id == "PMVISHWAKARMA":
            return f"पारंपरिक शिल्प कौशल के लिए ₹15,000 आधुनिक टूलकिट और 5% रियायती ब्याज दर पर ऋण सहायता।{loc_str}"
        elif s_id == "PMFME":
            return f"खाद्य प्रसंस्करण व्यवसाय के लिए 35% पूंजीगत सब्सिडी (अधिकतम ₹10 लाख) और ब्रांडिंग सहयोग।{loc_str}"
        elif s_id in ("STANDUP_INDIA", "STANDUP"):
            return f"महिला और अजा/अजजा उद्यमियों के लिए ₹10 लाख से ₹1 करोड़ तक का समग्र बैंक ऋण।{loc_str}"
        elif s_id == "PMKUSUM":
            return f"कृषि सिंचाई लागत घटाने हेतु सौर ऊर्जा वाटर पंपों पर 60% तक सरकारी सब्सिडी।{loc_str}"
        elif s_id == "NLM":
            return f"ग्रामीण कुक्कुट और पशुधन फार्म स्थापित करने हेतु 50% सीधी पूंजीगत सब्सिडी (₹50 लाख तक)।{loc_str}"
        elif s_id == "PMMSY":
            return f"मत्स्य पालन और जलीय कृषि अवसंरचना के लिए 40% से 60% पूंजीगत सब्सिडी।{loc_str}"
        elif s_id == "PMFBY":
            return f"प्रतिकूल मौसम और सूखा/बाढ़ से फसल नुकसान के विरुद्ध व्यापक बीमा सुरक्षा।{loc_str}"
        return f"आपकी प्रोफाइल के अनुसार उपयुक्त सरकारी योजना।{loc_str}"

    elif lang == "gu":
        biz_map = {
            "dairy": "ડેરી", "poultry": "મરઘાં પાલન", "fisheries": "મત્સ્ય પાલન",
            "agriculture": "કૃષિ", "food": "ફૂડ પ્રોસેસિંગ", "retail": "રિટેલ દુકાન"
        }
        gu_biz = biz_map.get(biz.lower(), biz or "ગ્રામીણ")
        loc_str = f" {location_str} માં લાગુ." if location_str else ""
        if s_id == "KCC":
            return f"તમારા '{gu_biz}' સાહસ માટે સીધું ઉપયોગી; રાહત દરે ૪% વ્યાજે કાર્યકારી મૂડી લોન.{loc_str}"
        elif s_id == "PMEGP":
            return f"તમારા નવા '{gu_biz}' ઉદ્યોગ માટે ૨૫%–૩૫% ગ્રામીણ માર્જિન મની સરકારી સબસિડી.{loc_str}"
        elif s_id == "PMMY":
            return f"તમારા '{gu_biz}' વ્યવસાય માટે કોઈપણ ગેરંટી વગર ₹૨૦ લાખ સુધીની લોન સહાય.{loc_str}"
        elif s_id == "PMVISHWAKARMA":
            return f"પરંપરાગત કારીગરો માટે ₹૧૫,૦૦૦ ટૂલકિટ સહાય અને ૫% ના રાહત દરે લોન.{loc_str}"
        elif s_id == "PMFME":
            return f"ફૂડ પ્રોસેસિંગ એકમ માટે ૩૫% મૂડી સબસિડી (મહત્તમ ₹૧૦ લાખ) અને બ્રાન્ડિંગ સહાય.{loc_str}"
        elif s_id in ("STANDUP_INDIA", "STANDUP"):
            return f"મહિલા અને SC/ST ઉદ્યોગસાહસિકો માટે ₹૧૦ લાખ થી ₹૧ કરોડ સુધીની કમ્પોઝિટ બેંક લોન.{loc_str}"
        elif s_id == "PMKUSUM":
            return f"સિંચાઈ ખર્ચ ઘટાડવા ખેતીના સોલર પંપ પર ૬૦% સુધીની સરકારી સબસિડી.{loc_str}"
        elif s_id == "NLM":
            return f"ગ્રામીણ મરઘાં અને પશુપાલન એકમ સ્થાપવા માટે ૫૦% સીધી મૂડી સબસિડી (₹૫૦ લાખ સુધી).{loc_str}"
        elif s_id == "PMMSY":
            return f"મત્સ્ય પાલન અને એક્વાકલ્ચર માળખાકીય સુવિધાઓ માટે ૪૦% થી ૬૦% સબસિડી.{loc_str}"
        elif s_id == "PMFBY":
            return f"કુદરતી આફતો સામે પાક નુકસાની માટે વ્યાપક વીમા સુરક્ષા.{loc_str}"
        return f"તમારી પ્રોફાઇલ મુજબ યોગ્ય સરકારી યોજના.{loc_str}"

    loc_str = f" Applicable in {location_str}." if location_str else ""
    return f"Directly supports your selected '{biz or 'rural'}' venture.{loc_str}"


def compute_verified_project_benefits(scheme_id: str, profile: UserAssessmentProfile | None) -> str:
    """
    Calculate grounded scheme benefits and subsidies from actual verified project metrics.
    Never invents values; adheres to official scheme guidelines.
    """
    s_id = (scheme_id or "").upper()
    meta = SCHEME_METADATA.get(s_id, {})
    default_benefit = meta.get("benefit", "Financial and operational assistance under official guidelines.")

    if not profile:
        return default_benefit

    cost = float(profile.project_cost or profile.investment or 0)
    loan = float(profile.loan_amount or 0)
    capital = float(profile.capital or 0)
    is_special = bool(
        profile.is_woman
        or profile.is_sc_st
        or (profile.gender and profile.gender.lower() in ("female", "woman"))
        or (profile.social_category and profile.social_category.upper() in ("SC", "ST", "OBC"))
        or (profile.special_categories and any(sp in profile.special_categories.lower() for sp in ["widow", "disability", "single woman"]))
    )

    if s_id == "PMEGP":
        if cost > 0:
            subsidy_rate = 35 if is_special else 25
            subsidy = min(round(cost * (subsidy_rate / 100.0)), 1750000)
            return (
                f"Eligible for {subsidy_rate}% rural margin money subsidy (~₹{subsidy:,}) "
                f"on your project cost of ₹{int(cost):,}, substantially reducing your required bank loan."
            )
        return "Substantial government margin money subsidy: 25% (general rural) to 35% (special category/women/SC/ST) of project cost."

    elif s_id == "PMFME":
        if cost > 0:
            subsidy = min(round(cost * 0.35), 1000000)
            return (
                f"35% credit-linked capital subsidy (~₹{subsidy:,}) on your ₹{int(cost):,} food processing unit, "
                f"plus common facility access, branding support, and FSSAI formalization."
            )
        return "35% credit-linked capital subsidy (max ₹10 Lakh per enterprise) for micro food processing units."

    elif s_id == "PMMY":
        target_loan = loan if loan > 0 else (cost - capital if cost > capital else 0)
        if target_loan > 0:
            if target_loan <= 50000:
                tier = "Shishu (up to ₹50,000)"
            elif target_loan <= 500000:
                tier = "Kishore (₹50,000 to ₹5 Lakh)"
            elif target_loan <= 1000000:
                tier = "Tarun (₹5 Lakh to ₹10 Lakh)"
            else:
                tier = "Tarun Plus (₹10 Lakh to ₹20 Lakh)"
            return (
                f"Qualifies under Mudra {tier} for ₹{int(target_loan):,} collateral-free institutional credit "
                f"with CGFMU guarantee coverage and competitive interest rates."
            )
        return "Collateral-free institutional credit up to ₹20 Lakh across Shishu, Kishore, Tarun, and Tarun Plus tiers."

    elif s_id == "KCC":
        target_amt = loan if loan > 0 else (cost if cost > 0 else 300000)
        limit = min(int(target_amt), 300000)
        return (
            f"Subsidized 4% effective interest rate on working capital credit up to ₹{limit:,} "
            f"(collateral-free up to ₹1.6 Lakh) for dairy cattle maintenance, animal feed, and allied farm operations."
        )

    elif s_id == "PMVISHWAKARMA":
        return (
            "₹15,000 digital e-voucher for modern toolkits, basic skill training with ₹500/day stipend, "
            "and collateral-free enterprise loan at concessional 5% interest rate (up to ₹3 Lakh in 2 tranches)."
        )

    elif s_id == "STANDUP_INDIA":
        target_amt = loan if loan > 0 else (cost * 0.85 if cost > 0 else 1000000)
        limit = min(max(int(target_amt), 1000000), 10000000)
        return (
            f"Composite greenfield enterprise loan up to ₹{limit:,} covering up to 85% of project cost "
            f"with Credit Guarantee coverage for Women and SC/ST entrepreneurs."
        )

    elif s_id == "PMKUSUM":
        if cost > 0:
            subsidy = round(cost * 0.60)
            return (
                f"60% combined capital subsidy (~₹{subsidy:,}) on solar agricultural water pump setup, "
                f"eliminating recurring diesel and commercial electricity expenses."
            )
        return "Up to 60% capital subsidy (30% Central + 30% State) for standalone or grid-connected solar agricultural pumps."

    elif s_id == "NLM":
        if cost > 0:
            subsidy = min(round(cost * 0.50), 5000000)
            return (
                f"50% back-ended capital subsidy (~₹{subsidy:,}) disbursed via SIDBI for poultry breeding, "
                f"sheep/goat rearing, or animal feed plant infrastructure."
            )
        return "50% direct capital subsidy (up to ₹25–50 Lakh) for livestock, sheep, goat, and poultry farm infrastructure."

    elif s_id == "PMMSY":
        sub_rate = 60 if is_special else 40
        if cost > 0:
            subsidy = round(cost * (sub_rate / 100.0))
            return (
                f"{sub_rate}% capital subsidy (~₹{subsidy:,}) on pond excavation, biofloc units, "
                f"and modern aquaculture machinery."
            )
        return f"{sub_rate}% capital subsidy dedicated to fisheries and aquaculture infrastructure."

    elif s_id == "PMFBY":
        return (
            "Comprehensive seasonal crop insurance covering non-preventable yield loss and adverse weather; "
            "farmers pay only nominal 1.5% to 2% premium."
        )

    return default_benefit


def determine_scheme_why_eligible(
    scheme_id: str,
    profile: UserAssessmentProfile | None,
    reasons: list[str],
) -> str:
    """Explain clearly why the user appears eligible or relevant for this scheme."""
    if reasons:
        return "; ".join(reasons)
    if not profile or not (profile.business or profile.capital or profile.district):
        return "Baseline rural enterprise scheme. Complete your business assessment for specific eligibility criteria."
    biz = profile.business or profile.business_interest or "rural enterprise"
    return f"Your business focus in '{biz}' aligns with the target sector and regional priority guidelines for this scheme."


def determine_scheme_next_action(status: str, scheme_name: str, app_url: str) -> str:
    """Return a concrete, actionable next step for the entrepreneur based on match status."""
    if status == "Likely eligible":
        return "Generate your Detailed Project Report (DPR) to attach as technical appraisal, then apply on the official portal or visit your nearest bank branch."
    elif status == "Potentially eligible":
        return "Answer the scheme eligibility questionnaire to verify specific criteria, and gather required KYC & land/trade documents."
    elif status == "Not eligible":
        return "Review specific unmet eligibility conditions or explore alternative schemes matching your business profile."
    else:  # Insufficient information
        return "Complete your business assessment (business type, capital, location) to evaluate your qualification for this scheme."


def recommend_schemes(profile: UserAssessmentProfile | None = None) -> list[SchemeRecommendation]:
    """
    Rank and personalize government schemes based on user assessment profile and financial plan.
    Strictly categorizes match into:
    - Likely eligible
    - Potentially eligible
    - Not eligible
    - Insufficient information
    Never claims guaranteed eligibility; grounded in verified official dataset.
    """
    schemes = _load_csv()
    if not schemes:
        return []

    # If no profile provided or essentially empty profile
    has_meaningful_profile = bool(
        profile
        and (
            profile.business
            or profile.business_interest
            or profile.ml_recommendation
            or profile.capital
            or profile.district
            or profile.is_woman
            or profile.is_sc_st
        )
    )

    if not profile or not has_meaningful_profile:
        results = []
        for s in schemes:
            s_id = s["scheme_id"]
            benefits = compute_verified_project_benefits(s_id, profile)
            results.append(
                SchemeRecommendation(
                    scheme_id=s_id,
                    scheme_name=s["scheme_name"],
                    government_level=s["government_level"],
                    categories=s["categories"],
                    business_categories=s["business_categories"],
                    eligibility_criteria=s["eligibility_criteria"],
                    eligibility_questions=s["eligibility_questions"],
                    source_url=s["source_url"],
                    application_url=s["application_url"],
                    short_description=s.get("short_description"),
                    max_loan=s.get("max_loan"),
                    interest_rate=s.get("interest_rate"),
                    subsidy=s.get("subsidy"),
                    match_score=60,
                    relevance_reason="Complete your business assessment for personalized matching.",
                    eligibility_status="Insufficient information",
                    why_eligible="Enterprise information not yet provided. Assessment required to determine eligibility.",
                    satisfied_conditions=[],
                    missing_conditions=["Business assessment not completed", "Location not specified", "Capital outlay unknown"],
                    required_documents=s.get("docs", ["Aadhaar Card", "Bank Account Details", "Detailed Project Report"]),
                    benefits=benefits,
                    next_action=determine_scheme_next_action("Insufficient information", s["scheme_name"], s["application_url"]),
                    # Backwards compatibility
                    satisfied_criteria=[],
                    unmet_criteria=[],
                    missing_questions=s["eligibility_questions"],
                )
            )
        return results

    user_biz = (profile.business or profile.business_interest or "").strip()
    ml_biz = (profile.ml_recommendation or "").strip()
    ml_top3 = [b.strip().lower() for b in (profile.ml_top3 or []) if b]
    location_str = ", ".join(filter(None, [profile.village, profile.block, profile.district, profile.state]))
    user_capital = profile.capital or 0
    project_cost = profile.project_cost or profile.investment or 0
    loan_amount = profile.loan_amount or 0
    biz_category = (profile.business_category or "").lower()

    results = []

    for s in schemes:
        s_id = s["scheme_id"]
        biz_cats = [b.lower() for b in s["business_categories"]]
        cats = [c.lower() for c in s["categories"]]

        score = 55
        reasons: list[str] = []
        satisfied: list[str] = []
        unmet: list[str] = []
        status = "Potentially eligible"

        # 1. Business Category Matching
        matched_biz = False
        if user_biz and any(user_biz.lower() in b for b in biz_cats):
            score += 25
            matched_biz = True
            reasons.append(f"Directly supports your selected '{user_biz}' venture")
            satisfied.append(f"Business category aligns with {user_biz}")
        elif ml_biz and any(ml_biz.lower() in b for b in biz_cats):
            score += 20
            matched_biz = True
            reasons.append(f"Matches your ML-recommended business '{ml_biz}'")
            satisfied.append(f"Recommended business fits {ml_biz}")
        elif ml_top3 and any(any(top in b for b in biz_cats) for top in ml_top3):
            score += 12
            reasons.append("Covers one of your top-ranked business opportunities")
            satisfied.append("Covers top business opportunity")

        if biz_category and any(biz_category in b for b in biz_cats):
            score += 10
            satisfied.append(f"Broad enterprise category ({biz_category}) is eligible")

        # 2. Scheme-Specific Profile & Eligibility Alignments
        if s_id == "PMMY":
            score += 10
            reasons.append("Universal collateral-free financing for rural micro and small enterprises")
            satisfied.append("Applicable to non-corporate, non-farm micro enterprise")
            if loan_amount > 0 and loan_amount <= 2000000:
                satisfied.append(f"Requested loan amount ₹{int(loan_amount):,} falls within ₹20 Lakh Mudra ceiling")
            elif loan_amount > 2000000:
                unmet.append("Requested loan exceeds the ₹20 Lakh PMMY maximum ceiling")
                score -= 20

        elif s_id == "PMEGP":
            score += 10
            reasons.append("Provides substantial 25%–35% rural margin money subsidy for new units")
            satisfied.append("Supports new rural enterprise creation")
            if project_cost > 0 and project_cost <= 5000000:
                satisfied.append(f"Project cost ₹{int(project_cost):,} is within PMEGP micro-enterprise limit (₹50 Lakh Mfg / ₹20 Lakh Service)")
            elif project_cost > 5000000:
                unmet.append("Project cost exceeds the PMEGP ₹50 Lakh maximum ceiling")
                score -= 15

        elif s_id == "KCC":
            if any(b in ["dairy", "agriculture", "poultry", "fisheries"] for b in [user_biz.lower(), ml_biz.lower()]):
                score += 15
                reasons.append("Lowest 4% effective interest rate for working capital in dairy and allied farming")
                satisfied.append("Covers allied agriculture & livestock working capital")

        elif s_id == "PMFME":
            if "food" in user_biz.lower() or "food" in ml_biz.lower() or "flour" in user_biz.lower() or "spice" in user_biz.lower():
                score += 20
                reasons.append("Provides 35% capital subsidy up to ₹10 Lakh for food processing")
                satisfied.append("Food processing enterprise focus")

        elif s_id == "STANDUP_INDIA":
            is_woman_or_sc_st = (
                profile.is_woman
                or profile.is_sc_st
                or (profile.gender and profile.gender.lower() in ("female", "woman"))
                or (profile.social_category and profile.social_category.upper() in ("SC", "ST"))
            )
            if is_woman_or_sc_st:
                score += 25
                reasons.append("Priority composite funding from ₹10 Lakh to ₹1 Crore for Women and SC/ST entrepreneurs")
                satisfied.append("Target demographic criteria met (Woman / SC / ST)")
                status = "Likely eligible"
            else:
                score -= 15
                unmet.append("Stand-Up India is exclusively reserved for SC/ST and Women entrepreneurs")
                reasons.append("Dedicated scheme for SC/ST and Women entrepreneurs for greenfield ventures")
                status = "Not eligible"

        elif s_id == "PMVISHWAKARMA":
            artisan_keywords = ["tailor", "textile", "carpenter", "blacksmith", "potter", "handicraft", "artisan", "mason", "barber"]
            user_resources = " ".join(profile.resources or []).lower()
            user_occ = (profile.occupation or "").lower()
            if (
                any(kw in user_biz.lower() for kw in artisan_keywords)
                or any(kw in user_resources for kw in artisan_keywords)
                or any(kw in user_occ for kw in artisan_keywords)
            ):
                score += 25
                reasons.append("₹15,000 modern toolkit + 5% subsidized credit for skilled traditional crafts")
                satisfied.append("Traditional trade skill alignment")
                status = "Likely eligible"

        elif s_id == "PMKUSUM":
            has_farm = "agri" in user_biz.lower() or "agri" in ml_biz.lower() or (profile.occupation and "farmer" in profile.occupation.lower())
            if has_farm:
                score += 15
                reasons.append("Subsidizes up to 60% of solar pump costs for agricultural irrigation")
                if profile.has_land:
                    satisfied.append("Agricultural land available for solar pump installation")

        elif s_id == "NLM":
            if any(k in user_biz.lower() for k in ["poultry", "dairy", "livestock", "goat"]):
                score += 20
                reasons.append("Direct 50% capital subsidy (up to ₹25–50 Lakh) for poultry and livestock breeding")
                satisfied.append("Livestock & poultry development focus")

        elif s_id == "PMMSY":
            if "fish" in user_biz.lower() or "aquaculture" in user_biz.lower():
                score += 25
                reasons.append("40% to 60% capital subsidy dedicated to fisheries and aquaculture units")
                satisfied.append("Fisheries sector alignment")
                status = "Likely eligible"

        elif s_id == "PMFBY":
            if "agri" in user_biz.lower() or "farm" in user_biz.lower() or (profile.occupation and "farmer" in profile.occupation.lower()):
                score += 15
                reasons.append("Shields your crop investment against adverse weather and yield loss")
                satisfied.append("Protects agricultural production")

        # Additional Demographic & Income Eligibility Adjustments
        if profile.special_categories and any(sp in profile.special_categories.lower() for sp in ["disability", "widow", "single woman", "divorced"]):
            if s_id in ("PMEGP", "STANDUP_INDIA"):
                score += 10
                reasons.append("Special category priority subsidy (up to 35% margin money assistance)")
                satisfied.append("Eligible for special category subsidy preference")

        if profile.annual_family_income and profile.annual_family_income <= 300000:
            if s_id in ("PMMY", "PMEGP", "KCC", "PMVISHWAKARMA"):
                score += 5
                satisfied.append("Qualifies for priority micro-credit under low-income threshold")

        # Location connection
        if location_str:
            satisfied.append(f"Applicant located in operational territory ({location_str})")

        # 3. Capital & Loan Needed adjustments
        if profile.loan_needed and profile.loan_needed.lower() in ("yes", "true", "required"):
            if "credit" in cats or "finance" in cats or "msme" in cats:
                score += 8

        # 4. Strict 4-Category Status Determination
        if status != "Not eligible":
            if unmet:
                status = "Not eligible"
            elif matched_biz and score >= 75:
                status = "Likely eligible"
            elif matched_biz or score >= 60:
                status = "Potentially eligible"
            else:
                status = "Insufficient information"

        # Cap score between 45 and 98
        score = max(45, min(98, score))

        # Build missing conditions
        missing_conds = []
        if unmet:
            missing_conds.extend(unmet)
        if status != "Likely eligible":
            questions = s.get("eligibility_questions", [])
            for q in questions[:3]:
                if not any(q.lower() in sat.lower() for sat in satisfied):
                    missing_conds.append(f"Verification required: {q}")

        user_lang = getattr(profile, "language", "en") or "en"
        if user_lang in ("hi", "gu"):
            relevance_text = _generate_localized_relevance_reason(s["scheme_id"], user_biz, location_str, user_lang)
        else:
            relevance_text = "; ".join(reasons) if reasons else "Eligible rural enterprise scheme based on your profile."
            if location_str:
                relevance_text += f" Applicable in {location_str}."

        benefits_text = compute_verified_project_benefits(s_id, profile)
        why_elig = determine_scheme_why_eligible(s_id, profile, reasons)
        next_act = determine_scheme_next_action(status, s["scheme_name"], s["application_url"])

        results.append(
            SchemeRecommendation(
                scheme_id=s["scheme_id"],
                scheme_name=s["scheme_name"],
                government_level=s["government_level"],
                categories=s["categories"],
                business_categories=s["business_categories"],
                eligibility_criteria=s["eligibility_criteria"],
                eligibility_questions=s["eligibility_questions"],
                source_url=s["source_url"],
                application_url=s["application_url"],
                short_description=s.get("short_description"),
                max_loan=s.get("max_loan"),
                interest_rate=s.get("interest_rate"),
                subsidy=s.get("subsidy"),
                match_score=score,
                relevance_reason=relevance_text,
                eligibility_status=status,
                why_eligible=why_elig,
                satisfied_conditions=satisfied,
                missing_conditions=missing_conds,
                required_documents=s.get("docs", ["Aadhaar Card", "PAN Card", "Project Report", "Bank Statement"]),
                benefits=benefits_text,
                next_action=next_act,
                # Backwards-compatible aliases
                satisfied_criteria=satisfied,
                unmet_criteria=unmet,
                missing_questions=s["eligibility_questions"],
            )
        )

    # Sort descending by match_score
    results.sort(key=lambda r: r.match_score, reverse=True)
    return results


def evaluate_eligibility(
    scheme_id: str,
    answers: dict[str, Any],
    profile: UserAssessmentProfile | None = None,
) -> EligibilityEvaluateResponse:
    """
    Evaluate user's answers against a specific scheme's eligibility questions.
    Returns satisfied conditions, missing conditions, required documents, verified benefits,
    actionable next step, and strictly categorized status (Likely eligible, Potentially eligible,
    Not eligible, Insufficient information).
    Never guarantees approval; disclaimer included.
    """
    scheme = get_scheme_by_id(scheme_id)
    if not scheme:
        return EligibilityEvaluateResponse(
            scheme_id=scheme_id,
            scheme_name="Unknown Scheme",
            eligibility_status="Insufficient information",
            status_code="insufficient_information",
            why_eligible="Scheme not found in database.",
            satisfied_conditions=[],
            missing_conditions=["Scheme record missing"],
            required_documents=[],
            benefits="",
            next_action="Select a recognized government scheme from the catalogue.",
            summary_note="Scheme not found in database.",
        )

    questions = scheme.get("eligibility_questions", [])
    satisfied: list[str] = []
    unmet: list[str] = []
    missing: list[str] = []

    # Map normalized answers
    norm_answers: dict[str, str] = {}
    for k, v in answers.items():
        norm_answers[str(k).strip()] = str(v).strip().lower()

    # Iterate questions
    for idx, q_text in enumerate(questions):
        user_val = norm_answers.get(str(idx))
        if user_val is None:
            for ak, av in norm_answers.items():
                if ak.lower() in q_text.lower() or q_text.lower() in ak.lower():
                    user_val = av
                    break

        if user_val is None:
            # Check profile inference
            if "18 or older" in q_text.lower() or "above 18" in q_text.lower():
                user_val = "yes"  # Adults using GRAMSAARTHI
            elif "woman or sc/st" in q_text.lower():
                if profile and (profile.is_woman or profile.is_sc_st):
                    user_val = "yes"
                elif profile and profile.is_woman is False and profile.is_sc_st is False:
                    user_val = "no"

        if user_val is None:
            missing.append(q_text)
        elif user_val in ("yes", "true", "y", "1"):
            if "government employee" in q_text.lower():
                unmet.append("Government employees and their immediate families are excluded from PM Vishwakarma benefits.")
            elif "another family member received" in q_text.lower():
                unmet.append("Only one member per family is eligible under PM Vishwakarma.")
            else:
                satisfied.append(q_text)
        elif user_val in ("no", "false", "n", "0"):
            if "government employee" in q_text.lower() or "another family member" in q_text.lower():
                satisfied.append("Not a government employee / single family member rule satisfied")
            else:
                unmet.append(f"Did not meet requirement: '{q_text}'")
        else:
            satisfied.append(f"Specified details: {user_val}")

    # Determine status using strict 4 categories
    if unmet:
        status_str = "Not eligible"
        status_code = "not_eligible"
        summary_note = "One or more essential eligibility criteria were not met based on your answers."
    elif missing and len(satisfied) == 0:
        status_str = "Insufficient information"
        status_code = "insufficient_information"
        summary_note = "Please answer the eligibility questions to evaluate your qualification for this scheme."
    elif missing and len(satisfied) < len(questions):
        status_str = "Potentially eligible"
        status_code = "potentially_eligible"
        summary_note = f"You satisfy {len(satisfied)} condition(s). Answering the remaining {len(missing)} question(s) will complete eligibility verification."
    elif len(satisfied) > 0 and len(unmet) == 0 and len(missing) == 0:
        status_str = "Likely eligible"
        status_code = "likely_eligible"
        summary_note = "Great news! Based on your responses, you appear to meet all primary criteria for this scheme."
    else:
        status_str = "Insufficient information"
        status_code = "insufficient_information"
        summary_note = "Please answer the eligibility questions to check your qualification for this scheme."

    benefits_text = compute_verified_project_benefits(scheme["scheme_id"], profile)
    why_elig = (
        f"You satisfied {len(satisfied)} of {len(questions)} verified criteria for {scheme['scheme_name']}."
        if satisfied else "Questionnaire responses required to determine eligibility rationale."
    )
    missing_conds = unmet + [f"Unanswered question: {q}" for q in missing]
    required_docs = scheme.get("docs", ["Aadhaar Card", "PAN Card", "Detailed Project Report", "Bank Statement"])
    next_act = determine_scheme_next_action(status_str, scheme["scheme_name"], scheme["application_url"])

    return EligibilityEvaluateResponse(
        scheme_id=scheme["scheme_id"],
        scheme_name=scheme["scheme_name"],
        eligibility_status=status_str,
        status_code=status_code,
        why_eligible=why_elig,
        satisfied_conditions=satisfied,
        missing_conditions=missing_conds,
        required_documents=required_docs,
        benefits=benefits_text,
        next_action=next_act,
        # Backwards compatibility
        status=status_str,
        satisfied_criteria=satisfied,
        unmet_criteria=unmet,
        missing_questions=missing,
        summary_note=summary_note,
        disclaimer=(
            "Indicative guidance only. Never guarantees scheme approval or loan sanction. "
            "Final eligibility depends on official government notifications, implementing agency verification, and bank credit appraisal."
        ),
    )


def get_schemes(
    db: Any = None,
    location: str | None = None,
    business: str | None = None,
    capital: int | None = None,
    category: str | None = None,
    project_cost: int | None = None,
    loan_amount: int | None = None,
) -> list[dict[str, Any]]:
    """
    Backwards-compatible wrapper returning schemes in dict format,
    enriched with Phase 5 fields (why_eligible, conditions, verified benefits, next_action).
    """
    profile = UserAssessmentProfile(
        business=business,
        capital=capital,
        state=location,
        project_cost=project_cost,
        loan_amount=loan_amount,
    )
    recommendations = recommend_schemes(profile)

    results = []
    for idx, rec in enumerate(recommendations, start=1):
        s_raw = get_scheme_by_id(rec.scheme_id) or {}
        results.append({
            "id": idx,
            "scheme_id": rec.scheme_id,
            "name": rec.scheme_name,
            "tag": s_raw.get("tag", rec.government_level),
            "tag_color": s_raw.get("tag_color", "blue"),
            "tagColor": s_raw.get("tag_color", "blue"),
            "category": rec.categories[0] if rec.categories else "General",
            "categories": rec.categories,
            "business_categories": rec.business_categories,
            "government_level": rec.government_level,
            "max_loan": rec.max_loan or s_raw.get("max_loan", "Flexible"),
            "maxLoan": rec.max_loan or s_raw.get("max_loan", "Flexible"),
            "interest": rec.interest_rate or s_raw.get("interest_rate", "Bank rate"),
            "tenure": s_raw.get("tenure", "3 to 5 years"),
            "who": s_raw.get("who", rec.eligibility_criteria[:100]),
            "match": rec.match_score,
            "match_score": rec.match_score,
            "relevance_reason": rec.relevance_reason,
            "eligibility_status": rec.eligibility_status,
            "why_eligible": rec.why_eligible,
            "satisfied_conditions": rec.satisfied_conditions,
            "missing_conditions": rec.missing_conditions,
            "required_documents": rec.required_documents,
            "benefits": rec.benefits,
            "next_action": rec.next_action,
            "docs": rec.required_documents or s_raw.get("docs", []),
            "eligibility": s_raw.get("eligibility_questions", []),
            "eligibility_criteria": rec.eligibility_criteria,
            "benefit": rec.benefits or s_raw.get("benefit", rec.short_description),
            "source_url": rec.source_url,
            "application_url": rec.application_url,
            "official_url": rec.application_url,
        })

    # Optional category filter
    if category and category.lower() not in ("all schemes", "all", ""):
        cat_lower = category.lower()
        results = [
            r for r in results
            if any(cat_lower in c.lower() for c in r.get("categories", []))
            or any(cat_lower in b.lower() for b in r.get("business_categories", []))
        ]

    return results

