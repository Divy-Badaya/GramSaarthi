"""
Test script for verifying AI Advisor fixes across:
1. Business-only queries
2. Scheme-only queries
3. Combined Business + Scheme queries
4. General queries
5. Multilingual queries (English, Hindi, Gujarati)
6. Fallback engine resilience
"""

import sys
import os

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.schemas.advisor import AdvisorRequest, UserProfileContext, SchemeContext
from app.services.advisor_service import (
    get_advisor_response,
    detect_query_intent,
    _get_rule_based_response,
)

def run_tests():
    print("=" * 60)
    print("AI ADVISOR COMPREHENSIVE VERIFICATION")
    print("=" * 60)

    # 1. Intent Detection Tests
    intent_cases = [
        ("What business should I start?", False, "BUSINESS"),
        ("Which business is profitable in my area?", True, "BUSINESS"),
        ("What business can I start with ₹2 lakh?", False, "BUSINESS"),
        ("I want to start a dairy business.", True, "BUSINESS"),
        ("What are the investment requirements for a poultry business?", False, "BUSINESS"),
        ("Which business has high local demand?", False, "BUSINESS"),
        ("What are the risks of starting a textile business?", False, "BUSINESS"),
        ("Compare agriculture and dairy businesses.", False, "BUSINESS"),
        ("Give me a business plan.", False, "BUSINESS"),
        ("How much profit can I expect?", False, "BUSINESS"),
        ("What skills are required?", False, "BUSINESS"),
        ("I want to start a dairy business. Which government schemes can help me?", False, "BUSINESS_AND_SCHEME"),
        ("What government schemes are available for this business?", False, "BUSINESS_AND_SCHEME"),
        ("Tell me about PM Mudra Yojana", False, "SCHEME"),
        ("Am I eligible for this scheme?", True, "SCHEME"),
        ("What documents do I need?", True, "SCHEME"),
        ("मुझे कौन सा व्यवसाय शुरू करना चाहिए?", True, "BUSINESS"),
        ("डेयरी व्यवसाय के लिए कौन सी सरकारी योजनाएं हैं?", False, "BUSINESS_AND_SCHEME"),
        ("ડેરી વ્યવસાય માટે કઈ સરકારી યોજનાઓ છે?", False, "BUSINESS_AND_SCHEME"),
        ("મારા વિસ્તારમાં કયો વ્યવસાય નફાકારક છે?", False, "BUSINESS"),
    ]

    print("\n--- Testing Intent Classification ---")
    intent_pass = True
    for q, has_scheme, expected in intent_cases:
        detected = detect_query_intent(q, has_active_scheme=has_scheme)
        ok = detected == expected
        if not ok:
            intent_pass = False
            print(f"❌ FAIL: '{q}' [has_scheme={has_scheme}] -> {detected} (expected {expected})")
        else:
            print(f"✅ PASS: '{q[:40]}...' -> {detected}")
    print(f"Intent Classification Overall: {'PASS' if intent_pass else 'FAIL'}")

    # 2. Live Advisor Response Tests (Gemini or Rule-Based Fallback)
    profile_en = UserProfileContext(
        name="Ramesh Kumar",
        district="Sehore",
        state="Madhya Pradesh",
        capital=200000,
        business_interest="Dairy",
        language="en",
    )
    profile_hi = UserProfileContext(
        name="रामेश कुमार",
        district="सीहोर",
        state="मध्य प्रदेश",
        capital=200000,
        business_interest="डेयरी",
        language="hi",
    )
    profile_gu = UserProfileContext(
        name="રમેશભાઈ",
        district="આણંદ",
        state="ગુજરાત",
        capital=200000,
        business_interest="ડેરી",
        language="gu",
    )

    scheme_nlm = SchemeContext(
        scheme_id="NLM",
        scheme_name="National Livestock Mission (NLM)",
        government_level="Central",
        max_loan="Up to ₹50 Lakh",
        subsidy="50% Capital Subsidy",
        eligibility_criteria="Individuals, SHGs, JLGs, FPOs, and Section 8 companies engaged in poultry, sheep, goat, and piggery breeding.",
        docs=["Aadhaar Card", "Land documents / lease deed", "Detailed Project Report (DPR)", "Bank Account Details"],
    )

    live_queries = [
        ("Business-Only (Start)", "What business should I start?", profile_en, scheme_nlm),
        ("Business-Only (Profitable)", "Which business is profitable in my area?", profile_en, None),
        ("Business-Only (Capital)", "What business can I start with ₹2 lakh?", profile_en, None),
        ("Business-Only (Investment Poultry)", "What are the investment requirements for a poultry business?", profile_en, None),
        ("Business-Only (Comparison)", "Compare agriculture and dairy businesses.", profile_en, None),
        ("Business-Only (Plan)", "Give me a business plan.", profile_en, None),
        ("Scheme-Only (Mudra)", "Tell me about PM Mudra Yojana.", profile_en, None),
        ("Scheme-Only (Eligibility)", "Am I eligible for this scheme?", profile_en, scheme_nlm),
        ("Combined (Dairy + Schemes)", "I want to start a dairy business. Which government schemes can help me?", profile_en, None),
        ("Hindi Business", "मुझे कौन सा व्यवसाय शुरू करना चाहिए?", profile_hi, None),
        ("Hindi Combined", "डेयरी व्यवसाय के लिए कौन सी सरकारी योजनाएं हैं?", profile_hi, None),
        ("Gujarati Business", "મારા વિસ્તારમાં કયો વ્યવસાય નફાકારક છે?", profile_gu, None),
        ("Gujarati Combined", "ડેરી વ્યવસાય માટે કઈ સરકારી યોજનાઓ છે?", profile_gu, None),
    ]

    print("\n--- Testing Advisor Responses (Gemini LLM / Fallback) ---")
    response_pass = True
    for cat, question, prof, sch in live_queries:
        req = AdvisorRequest(
            question=question,
            user_profile=prof,
            scheme_context=sch,
        )
        try:
            resp = get_advisor_response(req)
            ans = resp.response
            # Basic sanity checks: answer must be non-empty and must NOT be a generic greeting
            is_valid = len(ans) > 40 and ("Namaste! I am your GRAMSAARTHI" not in ans or "व्यवसाय" in ans or "business" in ans)
            print(f"[{cat}] (gemini_used={resp.gemini_used}, ml_used={resp.ml_used}, scheme_used={resp.scheme_used})")
            print(f"  Q: {question}")
            preview = ans.replace('\n', ' ')[:100]
            print(f"  A: {preview}...")
            if not is_valid:
                print(f"❌ FAIL: Suspicious response: {ans}")
                response_pass = False
            else:
                print("  Status: ✅ VALID")
        except Exception as e:
            print(f"❌ ERROR on '{question}': {e}")
            response_pass = False

    print("\n" + "=" * 60)
    print(f"FINAL RESULT: {'ALL PASS ✅' if (intent_pass and response_pass) else 'SOME FAILURES ❌'}")
    print("=" * 60)
    return intent_pass and response_pass

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
