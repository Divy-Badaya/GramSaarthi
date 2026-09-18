"""
GRAMSAARTHI — Application Configuration
Reads settings from the .env file via pydantic-settings.
"""

import pathlib
import os
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = pathlib.Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    DATABASE_URL: str = "mysql+pymysql://root:password@localhost:3306/gramsaarthi"
    FRONTEND_ORIGIN: str = "http://localhost:5174"

    # JWT & Authentication Security
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = 7

    # Gemini LLM — loaded from backend/.env only, never exposed to the frontend
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_MODEL: str = "gemini-flash-latest"
    GEMINI_FALLBACK_MODELS: str = "gemini-flash-lite-latest,gemini-3-flash-preview"
    @property
    def gemini_models_list(self) -> list[str]:
        """Returns primary model followed by configured fallback models."""
        models = [self.GEMINI_MODEL.strip()] if self.GEMINI_MODEL else ["gemini-flash-latest"]
        if self.GEMINI_FALLBACK_MODELS:
            for m in self.GEMINI_FALLBACK_MODELS.split(","):
                clean = m.strip()
                if clean and clean not in models:
                    models.append(clean)
        return models

    # Document Upload & Storage Settings
    UPLOAD_DIR: str = str(_BACKEND_DIR / "uploads" / "documents")
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB limit
    ALLOWED_EXTENSIONS: list[str] = ["pdf", "jpg", "jpeg", "png"]
    ALLOWED_MIME_TYPES: list[str] = ["application/pdf", "image/jpeg", "image/png", "image/pjpeg"]

    model_config = SettingsConfigDict(
        env_file=_ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Single shared instance — import this wherever config is needed.
settings = Settings()

