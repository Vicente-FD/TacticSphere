from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from pathlib import Path
import os

BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no definido. Crea tacticsphere-backend/.env con la cadena de conexión.")

# Ajuste para SQLite con FastAPI (evita errores de "check_same_thread")
# Para PostgreSQL, usar psycopg (psycopg3) que es compatible con Python 3.13
engine_args = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, **engine_args)
elif DATABASE_URL.startswith("postgresql"):
    # Usar psycopg (psycopg3) para PostgreSQL - compatible con Python 3.13
    # Cambiar postgresql:// a postgresql+psycopg:// para usar psycopg3
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(DATABASE_URL, **engine_args)
else:
    engine = create_engine(DATABASE_URL, **engine_args)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()