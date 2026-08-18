from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
from pathlib import Path
import os
import socket

BACKEND_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_ROOT / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no definido. Crea tacticsphere-backend/.env con la cadena de conexión.")


def _limpiar_url(url: str) -> str:
    """Tolera las formas en que suele llegar mal pegada la cadena de conexión.

    Los paneles de Neon/Render ofrecen el snippet como `psql '<url>'`, y al
    pegarlo en una variable de entorno quedan comillas, espacios o el propio
    nombre de la variable. Sin esta limpieza SQLAlchemy solo dice
    "Could not parse SQLAlchemy URL from given URL string", que no orienta nada.
    """
    url = url.strip()
    for prefijo in ("DATABASE_URL=", "psql ", "PGPASSWORD="):
        if url.startswith(prefijo):
            url = url[len(prefijo):].strip()
    if len(url) >= 2 and url[0] == url[-1] and url[0] in "\"'":
        url = url[1:-1].strip()
    # Forma estilo Heroku: SQLAlchemy 2.x ya no reconoce el esquema "postgres://".
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


DATABASE_URL = _limpiar_url(DATABASE_URL)

if not DATABASE_URL.startswith(("sqlite", "postgresql", "mysql")):
    raise RuntimeError(
        "DATABASE_URL no parece una cadena de conexión válida: empieza con "
        f"{DATABASE_URL[:24]!r}. Debe empezar con 'postgresql://' o 'sqlite:///'. "
        "Revisa que en el panel del proveedor no hayas copiado comillas ni el "
        "prefijo 'psql '."
    )

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

if engine.dialect.name == "postgresql" and os.getenv("DB_FORCE_IPV4", "1") != "0":
    # Render (y otros PaaS) no tienen salida IPv6, pero Neon publica registros A
    # y AAAA para el mismo host. Si libpq elige una AAAA la conexion muere con
    # "Network is unreachable". Resolvemos a IPv4 y la pasamos como hostaddr,
    # dejando host intacto: Neon rutea por SNI, asi que conectar contra la IP
    # pelada no funcionaria, y el certificado tambien se valida contra host.
    # Se resuelve en cada conexion nueva, para no fijar una IP que Neon rote.
    @event.listens_for(engine, "do_connect")
    def _forzar_ipv4(dialect, conn_rec, cargs, cparams):
        host = cparams.get("host")
        if host and not cparams.get("hostaddr"):
            try:
                infos = socket.getaddrinfo(host, None, socket.AF_INET)
            except socket.gaierror:
                return None  # sin registro A: que libpq resuelva como pueda
            if infos:
                cparams["hostaddr"] = infos[0][4][0]
        return None


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()