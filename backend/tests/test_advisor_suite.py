import sys
import os

# Set stdout to UTF-8
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.config import settings
from app.schemas.advisor import AdvisorRequest, UserProfileContext
from app.services.advisor_service import (
    get_advisor_response,
    detect_query_intent,
    _call_gemini,
    _get_gemini_models,
)

sample_profile = UserProfileContext(
    name="Ramesh Kumar",
    state="Rajasthan",
    district="Jaipur",
    capital=100000,
    annual_family_income=120000,
    occupation="Farmer",
    language="en",
)

test_cases = [
    ("English Business", "What business can I start with 1 lakh rupees?", "en"),
    ("English Scheme", "Which government schemes am I eligible for?", "en"),
    ("English Combined", "I want to start a dairy business. What schemes can help me?", "en"),
    ("Hindi Business", "मैं 1 लाख रुपये में कौन सा व्यवसाय शुरू कर सकता हूँ?", "hi"),
    ("Hindi Scheme", "डेयरी के लिए कौन सी सरकारी योजनाएं हैं?", "hi"),
    ("Gujarati Business", "હું ૧ લાખ રૂપિયામાં કયો વ્યવસાય શરૂ કરી શકું?", "gu"),
]

def run_advisor_matrix():
    print("=" * 70)
    print("RUNNING AI ADVISOR TEST MATRIX")
    print("=" * 70)
    print(f"Configured Primary Model: {settings.GEMINI_MODEL}")
    print(f"Configured Fallback Models: {settings.gemini_models_list[1:]}")
    print("-" * 70)

    passed = 0
    for label, question, lang in test_cases:
        print(f"\n[TEST] {label}: \"{question}\" (Lang: {lang})")
        try:
            prof = sample_profile.model_copy()
            prof.language = lang
            req = AdvisorRequest(question=question, user_profile=prof)
            resp = get_advisor_response(req)
            
            content = resp.response
            gemini_used = resp.gemini_used
            ml_used = resp.ml_used
            scheme_used = resp.scheme_used
            
            print(f"  -> Gemini Used: {gemini_used} | ML Used: {ml_used} | Scheme Used: {scheme_used}")
            print(f"  -> Response Length: {len(content)} chars")
            first_line = content.strip().split('\n')[0][:100]
            print(f"  -> First line: {first_line}...")

            # Assertions
            assert len(content) > 30, f"Response too short ({len(content)} chars)"
            assert "API key" not in content, "API key leaked in content!"
            assert "HTTP 404" not in content and "HTTP 500" not in content and "Internal Server Error" not in content, "Raw error code leaked!"
            assert not content.startswith("Error:"), "Raw error returned to user!"
            passed += 1
            print("  -> PASSED")
        except Exception as e:
            print(f"  -> FAILED: {e}")

    print("\n" + "=" * 70)
    print("TESTING FAILURE SCENARIOS & CASCADE")
    print("=" * 70)

    # Failure Scenario 1: Invalid Primary Model triggers Fallback
    print("\n[TEST Failure 1] Invalid Primary Model cascading to Fallback:")
    orig_primary = settings.GEMINI_MODEL
    try:
        settings.GEMINI_MODEL = "gemini-invalid-model-xyz-999"
        req = AdvisorRequest(question="What schemes are available for dairy?", user_profile=sample_profile)
        resp = get_advisor_response(req)
        print(f"  -> Response received: {len(resp.response)} chars")
        print(f"  -> Gemini Used: {resp.gemini_used}")
        assert len(resp.response) > 20
        print("  -> PASSED: Cascade handled invalid primary model seamlessly!")
        passed += 1
    except Exception as e:
        print(f"  -> FAILED: {e}")
    finally:
        settings.GEMINI_MODEL = orig_primary

    # Failure Scenario 2: Invalid API Key triggers Rule-Based Fallback
    print("\n[TEST Failure 2] Invalid API Key triggers Rule-Based Fallback:")
    import app.services.advisor_service as adv_svc
    orig_key = settings.GEMINI_API_KEY
    orig_client = adv_svc._gemini_client
    try:
        settings.GEMINI_API_KEY = "AIzaSyInvalidFakeKeyForTestingFallbackGracefully"
        adv_svc._gemini_client = None  # Force re-initialization with invalid key
        req = AdvisorRequest(question="Which schemes can help farmers?", user_profile=sample_profile)
        resp = get_advisor_response(req)
        print(f"  -> Response received: {len(resp.response)} chars")
        print(f"  -> Gemini Used: {resp.gemini_used} (Expected False)")
        assert resp.gemini_used is False, "Expected rule-based fallback!"
        assert len(resp.response) > 20
        assert "AIzaSy" not in resp.response, "API key leaked in fallback!"
        print(f"  -> Preview: {resp.response[:120]}...")
        print("  -> PASSED: Rule-based fallback succeeded gracefully without exposing errors or keys!")
        passed += 1
    except Exception as e:
        print(f"  -> FAILED: {e}")
    finally:
        settings.GEMINI_API_KEY = orig_key
        adv_svc._gemini_client = orig_client

    print("\n" + "=" * 70)
    print(f"FINAL RESULT: {passed} / {len(test_cases) + 2} tests passed successfully!")
    print("=" * 70)
    return passed == len(test_cases) + 2


def test_advisor_matrix_suite():
    """Pytest test case executing the comprehensive advisor matrix."""
    assert run_advisor_matrix() is True


if __name__ == "__main__":
    success = run_advisor_matrix()
    sys.exit(0 if success else 1)

