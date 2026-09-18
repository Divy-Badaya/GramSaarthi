"""
GRAMSAARTHI — Database Connection
Sets up the SQLAlchemy engine and provides a session factory.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings


# Create the SQLAlchemy engine using the DATABASE_URL from .env
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,   # Reconnects dropped connections automatically
    pool_recycle=3600,    # Recycle connections every hour
    echo=False,           # Set True to log all SQL statements for debugging
)

# SessionLocal is a factory: each request creates one session, closes when done
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.
    All model files must import and inherit from this Base.
    """
    pass


def get_db():
    """
    FastAPI dependency that yields a database session.
    Use with: db: Session = Depends(get_db)
    Automatically closes the session after the request finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
