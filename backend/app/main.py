"""
GRAMSAARTHI — FastAPI Application Entry Point

Architecture:
    React/Vite Frontend (port 5173)
        ↓ REST API
    FastAPI Backend (port 8000)   ← You are here
        ↓
    MySQL Database (port 3306)

Future architecture will add:
    ├── ML Recommendation Model
    ├── LLM AI Advisor
    └── Government Scheme Engine

Start the server:
    cd backend
    uvicorn app.main:app --reload

API documentation:
    http://localhost:8000/api/docs    (Swagger UI)
    http://localhost:8000/api/redoc  (ReDoc)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database.init_db import create_tables, seed_data
from app.services.business_ml_service import business_ml_service
from app.routes import health, auth, users, recommendations, schemes, assessments, advisor, finance, journey, dpr, documents, admin_documents, admin, notifications


# ── Lifespan ───────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs on startup:
      1. Load HistGradientBoosting ML model (327 features, 10 targets, 979 districts)
      2. Check Gemini API key availability
      3. Create DB tables and seed demo data
    """
    print("[GRAMSAARTHI] Starting backend...")

    # ── 1. Load ML Model (HistGradientBoosting: 327 features, 979 districts) ───
    try:
        business_ml_service.load()
        if business_ml_service.is_loaded:
            print("[GRAMSAARTHI] Production Business ML model loaded (HistGradientBoosting: 327 features, 10 targets, 979 districts).")
        else:
            print(f"[GRAMSAARTHI] WARNING: Production Business ML model failed to load: {business_ml_service.load_error}")
    except Exception as exc:
        print(f"[GRAMSAARTHI] WARNING: Production Business ML service initialization error: {exc}")


    # ── Gemini API key check ────────────────────────────────────────────────
    # NOTE: We check presence only — NEVER log the key value itself.
    gemini_key = settings.GEMINI_API_KEY
    if gemini_key and gemini_key.strip():
        print("[GRAMSAARTHI] Gemini API key: LOADED (AI Advisor will use Gemini LLM).")
    else:
        print("[GRAMSAARTHI] WARNING: Gemini API key NOT configured.")
        print("[GRAMSAARTHI] AI Advisor will use rule-based fallback. Add GEMINI_API_KEY to backend/.env")

    # ── Database ────────────────────────────────────────────────────────────
    try:
        create_tables()
        seed_data()
        print("[GRAMSAARTHI] Database ready.")
    except Exception as e:
        print(f"[GRAMSAARTHI] WARNING: Database init failed: {e}")
        print("[GRAMSAARTHI] Make sure MySQL is running and .env is configured.")
        print("[GRAMSAARTHI] Server starting anyway — check /api/health for status.")

    yield
    print("[GRAMSAARTHI] Server shutting down.")


# ── App instance ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="GRAMSAARTHI API",
    description="""
## GRAMSAARTHI — Rural Entrepreneur Support Platform

This API powers the GRAMSAARTHI platform that helps rural entrepreneurs:
- Discover suitable business opportunities
- Find government schemes and subsidies
- Get AI-powered business advice
- Generate Detailed Project Reports (DPR)

### Integration Points
- **Frontend:** React + Vite (port 5174)
- **Database:** MySQL via SQLAlchemy ORM
- **ML Model:** HistGradientBoosting regressor on 327 socioeconomic features across 979 districts

    ### Phase Status
- ✅ User profile and activity API
- ✅ ML-powered business recommendations (HistGradientBoosting + 979-district feature store)
- ✅ Government scheme matching
- ✅ Assessment submission
- ✅ AI Advisor — **Gemini-powered** (ML recommendation → Gemini LLM → personalised response)
- ⏳ Authentication/JWT (next phase)
    """,
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)


# ── CORS ───────────────────────────────────────────────────────────────────────
# Allow Vite dev server origins (supporting both localhost and 127.0.0.1 on all dev ports)

allowed_origins = list(dict.fromkeys(filter(None, [
    settings.FRONTEND_ORIGIN,
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
])))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global error handler ───────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler.
    Returns a safe error message — never exposes stack traces or DB details.
    """
    print(f"[ERROR] Unhandled exception on {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."},
    )


# ── Routers ────────────────────────────────────────────────────────────────────
# All routes are prefixed with /api

app.include_router(health.router,          prefix="/api")
app.include_router(auth.router,            prefix="/api")
app.include_router(users.router,           prefix="/api")
app.include_router(recommendations.router, prefix="/api")
app.include_router(schemes.router,         prefix="/api")
app.include_router(assessments.router,     prefix="/api")
app.include_router(advisor.router,         prefix="/api")
app.include_router(finance.router,         prefix="/api")
app.include_router(journey.router,         prefix="/api")
app.include_router(dpr.router,             prefix="/api")
app.include_router(documents.router,       prefix="/api")
app.include_router(admin_documents.router, prefix="/api")
app.include_router(admin.router,           prefix="/api")
app.include_router(notifications.router,   prefix="/api")


# ── Documentation & Root redirects ─────────────────────────────────────────────

@app.get("/docs", include_in_schema=False)
def docs_redirect():
    """Redirect /docs to /api/docs so both URLs work."""
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/api/docs")


@app.get("/", include_in_schema=False)
def root():
    """Redirect root to the API docs."""
    return {"message": "GRAMSAARTHI API is running. Visit /api/docs for documentation."}
