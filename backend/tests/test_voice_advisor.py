"""
GRAMSAARTHI — Voice & Speech-to-Text AI Advisor Backend Test Suite
Tests validation, speech transcript aliases, spoken word number extraction,
multilingual processing, profile persistence, authentication, and endpoints.
"""

import sys
import os

# Set stdout to UTF-8
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app
from app.config import settings
from app.database.connection import SessionLocal
from app.models.user import User
from app.schemas.advisor import AdvisorRequest, VoiceAdvisorRequest, UserProfileContext
from app.services.advisor_service import (
    get_advisor_response,
    detect_query_intent,
    extract_capital_mention,
    extract_business_mentions,
    _get_gemini_models,
)
from app.services.profile_service import extract_and_update_profile_from_text, calculate_profile_completion
from app.services.auth_service import create_access_token

client = TestClient(app)

total_tests = 0
passed_tests = 0


def run_test(name, test_func):
    global total_tests, passed_tests
    total_tests += 1
    print(f"\n[TEST {total_tests}] {name}")
    try:
        test_func()
        passed_tests += 1
        print("  -> STATUS: PASSED")
    except AssertionError as ae:
        print(f"  -> STATUS: FAILED (AssertionError: {ae})")
    except Exception as exc:
        print(f"  -> STATUS: FAILED (Exception: {type(exc).__name__}: {exc})")


# ── TEST 1: Spoken Capital Mention Extraction ──────────────────────────────────
def test_spoken_numbers():
    cases = [
        ("What business can I start with two lakh rupees?", 200000),
        ("I have 2 lakh capital", 200000),
        ("मैं दो लाख रुपये में काम शुरू करना चाहता हूँ", 200000),
        ("હું બે લાખ રૂપિયામાં ડેરી શરૂ કરવા માંગું છું", 200000),
        ("Starting with one lakh margin", 100000),
        ("Need loan for fifty thousand", 50000),
        ("बजट पचास हजार रुपये है", 50000),
        ("બજેટ ૫૦ હજાર છે", 50000),
    ]
    for q, expected in cases:
        extracted = extract_capital_mention(q)
        print(f"   Query: '{q[:40]}...' -> Extracted: {extracted} (Expected: {expected})")
        assert extracted == expected, f"Failed for '{q}': got {extracted}, expected {expected}"



# ── TEST 2: Business Voice Query with Spoken Words ──────────────────────────────
def test_business_voice_query():
    req = VoiceAdvisorRequest(
        transcript="What business can I start with two lakh rupees?",
        language="en",
        user_profile=UserProfileContext(
            name="Ramesh Kumar",
            district="Jaipur",
            state="Rajasthan",
            occupation="Farmer",
        )
    )
    resp = get_advisor_response(req)
    print(f"   Response chars: {len(resp.response)} | Gemini Used: {resp.gemini_used}")
    print(f"   Preview: {resp.response.strip().splitlines()[0][:100]}...")
    assert len(resp.response) > 50
    assert "two lakh" in req.transcript
    assert not resp.response.startswith("Error:")
    assert "404" not in resp.response and "Internal Server Error" not in resp.response



# ── TEST 3: Government Scheme Voice Query ──────────────────────────────────────
def test_scheme_voice_query():
    req = VoiceAdvisorRequest(
        transcript="Which government schemes am I eligible for?",
        language="en",
        user_profile=UserProfileContext(
            name="Ramesh Kumar",
            district="Jaipur",
            state="Rajasthan",
            occupation="Farmer",
            annual_family_income=120000,
            capital=100000,
        )
    )
    resp = get_advisor_response(req)
    print(f"   Scheme Used: {resp.scheme_used} | Response chars: {len(resp.response)}")
    print(f"   Preview: {resp.response.strip().splitlines()[0][:100]}...")
    assert len(resp.response) > 50
    assert resp.scheme_used is True
    # Grounded in official schemes (e.g. Mudra, KCC, PMEGP)
    assert any(s in resp.response.lower() for s in ["mudra", "kcc", "pmegp", "yojana", "scheme"])



# ── TEST 4: Combined Business + Scheme Voice Query ─────────────────────────────
def test_combined_voice_query():
    req = VoiceAdvisorRequest(
        transcript="I want to start a dairy business. Which government schemes can help me?",
        language="en",
        user_profile=UserProfileContext(
            name="Ramesh Kumar",
            district="Jaipur",
            state="Rajasthan",
            capital=100000,
            occupation="Farmer",
        )
    )
    intent = detect_query_intent(req.transcript)
    print(f"   Detected Intent: {intent}")
    assert intent == "BUSINESS_AND_SCHEME"
    resp = get_advisor_response(req)
    print(f"   Response chars: {len(resp.response)} | Scheme Used: {resp.scheme_used}")
    print(f"   Preview: {resp.response.strip().splitlines()[0][:100]}...")
    assert len(resp.response) > 50
    # Must contain both business feasibility and scheme guidance
    has_dairy = "dairy" in resp.response.lower() or "दूध" in resp.response or "ડેરી" in resp.response
    has_scheme = any(w in resp.response.lower() for w in ["scheme", "subsidy", "mudra", "kcc", "nlm", "pmegp", "योजना", "યોજના"])
    assert has_dairy, "Dairy guidance missing from combined response"
    assert has_scheme, "Scheme guidance missing from combined response"



# ── TEST 5: General Voice Query ────────────────────────────────────────────────
def test_general_voice_query():
    req = VoiceAdvisorRequest(
        transcript="How can I increase my income?",
        language="en",
        user_profile=UserProfileContext(
            name="Ramesh Kumar",
            district="Jaipur",
            state="Rajasthan",
            occupation="Farmer",
            capital=100000,
        )
    )
    resp = get_advisor_response(req)
    print(f"   Response chars: {len(resp.response)}")
    print(f"   Preview: {resp.response.strip().splitlines()[0][:100]}...")
    assert len(resp.response) > 50



# ── TEST 6: Multilingual Hindi Voice Query ─────────────────────────────────────
def test_hindi_voice_query():
    req = VoiceAdvisorRequest(
        transcript="मैं दो लाख रुपये में डेयरी व्यवसाय शुरू करना चाहता हूँ।",
        language="hi",
        user_profile=UserProfileContext(
            name="रमेश कुमार",
            state="राजस्थान",
            district="जयपुर",
            occupation="किसान",
            language="hi",
        )
    )
    resp = get_advisor_response(req)
    print(f"   Response chars: {len(resp.response)}")
    print(f"   Preview: {resp.response.strip().splitlines()[0][:100]}...")
    assert len(resp.response) > 50
    # Must contain natural Hindi characters
    hindi_chars = any('\u0900' <= char <= '\u097F' for char in resp.response)
    assert hindi_chars, "Expected Hindi Devanagari characters in response!"



# ── TEST 7: Multilingual Gujarati Voice Query ──────────────────────────────────
def test_gujarati_voice_query():
    req = VoiceAdvisorRequest(
        transcript="હું બે લાખ રૂપિયામાં ડેરી વ્યવસાય શરૂ કરવા માંગું છું.",
        language="gu",
        user_profile=UserProfileContext(
            name="રમેશ કુમાર",
            state="ગુજરાત",
            district="અમદાવાદ",
            occupation="ખેડૂત",
            language="gu",
        )
    )
    resp = get_advisor_response(req)
    print(f"   Response chars: {len(resp.response)}")
    print(f"   Preview: {resp.response.strip().splitlines()[0][:100]}...")
    assert len(resp.response) > 50
    # Must contain natural Gujarati characters
    gujarati_chars = any('\u0A80' <= char <= '\u0AFF' for char in resp.response)
    assert gujarati_chars, "Expected Gujarati script characters in response!"



# ── TEST 8: Progressive Profile Extraction & DB Persistence from Speech ────────
def test_profile_extraction_from_speech():
    db = SessionLocal()
    try:
        # Create or find a dedicated test user
        test_user = db.query(User).filter(User.phone == "9876599999").first()
        if not test_user:
            test_user = User(
                name="Test Speech User",
                phone="9876599999",
                language="hi",
                state="Rajasthan",
                district="Jaipur",
                occupation=None,
                capital=None,
                investment_capacity=None,
                business_interest=None,
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
        else:
            # Reset fields for test
            test_user.occupation = None
            test_user.capital = None
            test_user.investment_capacity = None
            test_user.business_interest = None
            db.commit()
            db.refresh(test_user)

        speech_text = "मैं किसान हूँ और मेरे पास दो लाख रुपये हैं और मैं डेयरी बिजनेस शुरू करना चाहता हूँ।"
        intent = detect_query_intent(speech_text)

        updates = extract_and_update_profile_from_text(db, test_user, speech_text, intent)
        print(f"   Extracted Updates: {updates}")
        
        # Verify fields extracted and persisted
        assert updates.get("occupation") == "Farmer", f"Expected Farmer, got {updates.get('occupation')}"
        assert updates.get("capital") == 200000, f"Expected 200000, got {updates.get('capital')}"
        assert updates.get("business_interest") == "Dairy", f"Expected Dairy, got {updates.get('business_interest')}"
        
        db.refresh(test_user)
        assert test_user.occupation == "Farmer"
        assert test_user.capital == 200000
        assert test_user.business_interest == "Dairy"
        
        completion = calculate_profile_completion(test_user)
        print(f"   New Profile Completion: {completion['percentage']}%")
        assert completion["percentage"] > 25
    finally:
        db.close()



# ── TEST 9: Empty & Null Transcription Handling ────────────────────────────────
def test_empty_transcription():
    # Test 1: Empty string
    req1 = VoiceAdvisorRequest(transcript="", language="en")
    resp1 = get_advisor_response(req1)
    print(f"   Empty string response: '{resp1.response}' | Gemini Used: {resp1.gemini_used}")
    assert "understand" in resp1.response.lower()
    assert resp1.gemini_used is False

    # Test 2: Whitespace only
    req2 = VoiceAdvisorRequest(transcript="    \t  \n  ", language="hi")
    resp2 = get_advisor_response(req2)
    print(f"   Whitespace response: '{resp2.response}'")
    assert "समझ" in resp2.response

    # Test 3: Null question/message/transcript
    req3 = AdvisorRequest(transcript=None, message=None, question=None)
    resp3 = get_advisor_response(req3)
    assert len(resp3.response) > 10
    assert resp3.gemini_used is False



# ── TEST 10: Extremely Long Transcription Handling ─────────────────────────────
def test_long_transcription():
    huge_text = "I want to start a business. " * 200  # ~5600 characters
    req = VoiceAdvisorRequest(transcript=huge_text, language="en")
    resp = get_advisor_response(req)
    print(f"   Input length: {len(huge_text)} chars | Output length: {len(resp.response)} chars")
    assert len(resp.response) > 30
    assert not resp.response.startswith("Error:")



# ── TEST 11: HTTP Endpoints (POST /api/advisor/ask & POST /api/advisor/voice) ──
def test_http_endpoints():
    # 1. Test POST /api/advisor/ask with transcript alias
    ask_payload = {
        "transcript": "What business can I start with two lakh rupees?",
        "language": "en"
    }
    res_ask = client.post("/api/advisor/ask", json=ask_payload)
    print(f"   POST /api/advisor/ask status: {res_ask.status_code}")
    assert res_ask.status_code == 200
    data_ask = res_ask.json()
    assert "response" in data_ask
    assert len(data_ask["response"]) > 30

    # 2. Test POST /api/advisor/voice dedicated endpoint
    voice_payload = {
        "transcript": "I want to start a dairy business. Which government schemes can help me?",
        "language": "en"
    }
    res_voice = client.post("/api/advisor/voice", json=voice_payload)
    print(f"   POST /api/advisor/voice status: {res_voice.status_code}")
    assert res_voice.status_code == 200
    data_voice = res_voice.json()
    assert "response" in data_voice
    assert len(data_voice["response"]) > 30

    # 3. Test empty voice request returns 200 with polite prompt
    res_empty = client.post("/api/advisor/voice", json={"transcript": "", "language": "en"})
    assert res_empty.status_code == 200
    data_empty = res_empty.json()
    assert "understand" in data_empty["response"].lower()

    # 4. Test invalid Bearer token returns 401 Unauthorized
    res_unauth = client.post(
        "/api/advisor/voice",
        json={"transcript": "Test query with bad token"},
        headers={"Authorization": "Bearer completely_bogus_invalid_jwt_token_xyz"}
    )
    print(f"   Invalid token response status: {res_unauth.status_code}")
    assert res_unauth.status_code == 401, f"Expected 401, got {res_unauth.status_code}"

    # 5. Test valid Bearer token returns 200 OK
    token = create_access_token(user_id=1)
    res_auth = client.post(
        "/api/advisor/voice",
        json={"transcript": "Which schemes can help farmers?"},
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"   Valid token response status: {res_auth.status_code}")
    assert res_auth.status_code == 200



# ── TEST 12: Gemini LLM Fallback on Voice Queries ──────────────────────────────
def test_voice_gemini_fallback():
    import app.services.advisor_service as adv_svc
    orig_key = settings.GEMINI_API_KEY
    orig_client = adv_svc._gemini_client
    try:
        settings.GEMINI_API_KEY = "AIzaSyFakeKeyForVoiceFallbackTesting"
        adv_svc._gemini_client = None  # Force re-init with invalid key
        req = VoiceAdvisorRequest(
            transcript="Which schemes can help farmers?",
            language="en",
            user_profile=UserProfileContext(name="Ramesh", state="Rajasthan", district="Jaipur")
        )
        resp = get_advisor_response(req)
        print(f"   Fallback response length: {len(resp.response)} chars | Gemini Used: {resp.gemini_used}")
        print(f"   Preview: {resp.response.strip().splitlines()[0][:100]}...")
        assert resp.gemini_used is False, "Expected rule-based fallback!"
        assert len(resp.response) > 30
        assert "AIzaSy" not in resp.response
    finally:
        settings.GEMINI_API_KEY = orig_key
        adv_svc._gemini_client = orig_client

def run_all_tests():
    global total_tests, passed_tests
    total_tests = 0
    passed_tests = 0
    print("=" * 75)
    print("RUNNING GRAMSAARTHI VOICE & SPEECH-TO-TEXT BACKEND TEST MATRIX")
    print("=" * 75)
    run_test("Spoken Word Numbers Extraction (English, Hindi, Gujarati)", test_spoken_numbers)
    run_test("Business Voice Query: 'What business can I start with two lakh rupees?'", test_business_voice_query)
    run_test("Scheme Voice Query: 'Which government schemes am I eligible for?'", test_scheme_voice_query)
    run_test("Combined Voice Query: 'I want to start a dairy business. Which government schemes can help me?'", test_combined_voice_query)
    run_test("General Voice Query: 'How can I increase my income?'", test_general_voice_query)
    run_test("Multilingual Hindi Voice: 'मैं दो लाख रुपये में डेयरी व्यवसाय शुरू करना चाहता हूँ।'", test_hindi_voice_query)
    run_test("Multilingual Gujarati Voice: 'હું બે લાખ રૂપિયામાં ડેરી વ્યવસાય શરૂ કરવા માંગું છું.'", test_gujarati_voice_query)
    run_test("Profile Entity Extraction & MySQL Persistence from Spoken Hindi", test_profile_extraction_from_speech)
    run_test("Empty, Whitespace, & Null Transcription Graceful Handling", test_empty_transcription)
    run_test("Extremely Long Transcription Truncation Protection", test_long_transcription)
    run_test("HTTP Endpoints (/api/advisor/ask & /api/advisor/voice) + Auth Validation", test_http_endpoints)
    run_test("Voice Query Gemini Fallback Cascade Graceful Degradation", test_voice_gemini_fallback)
    print("\n" + "=" * 75)
    print(f"TEST RUN COMPLETE: {passed_tests} / {total_tests} tests passed successfully!")
    print("=" * 75)


if __name__ == "__main__":
    run_all_tests()
