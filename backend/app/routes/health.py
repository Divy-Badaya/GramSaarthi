"""
GRAMSAARTHI — Health Check Route
GET /api/health
"""

from fastapi import APIRouter
from app.services.business_ml_service import business_ml_service

router = APIRouter()


@router.get("/health", tags=["Health"])
def health_check():
    """
    Returns server status and HistGradientBoosting production ML model status.
    """
    return {
        "status": "ok",
        "service": "GRAMSAARTHI API",
        "ml_engine": {
            "model_type": "HistGradientBoosting",
            "loaded": business_ml_service.is_loaded,
            "error": business_ml_service.load_error,
            "districts": business_ml_service.district_count,
            "features": len(business_ml_service.features),
            "targets": len(business_ml_service.targets),
        },
    }
