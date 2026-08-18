"""
Restaura los datos de la SQLite local hacia una base Postgres nueva y vacia.

A diferencia de export_data.py / import_data.py, este script:
  - Preserva los IDs originales (no remapea claves foraneas, asi que no puede
    corromper relaciones al cruzar mapeos de tablas distintas).
  - Deriva el orden de insercion de Base.metadata.sorted_tables, o sea que cubre
    TODAS las tablas del modelo automaticamente (incluidas subpilares,
    umbral_pilar y recomendaciones, que la lista escrita a mano omitia).
  - Reinicia las secuencias de Postgres al final, para que los INSERT que haga la
    app despues no choquen con los IDs ya ocupados.

Uso:
    # 1) Ensayo sin escribir nada
    python scripts/restore_to_postgres.py --dry-run

    # 2) Restauracion real
    python scripts/restore_to_postgres.py --target "postgresql://user:pass@host/db"

La URL de destino tambien puede venir de la variable de entorno TARGET_DATABASE_URL.
"""
import argparse
import io
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

from sqlalchemy import create_engine, select, text

from app.database import Base
from app import models  # noqa: F401  (registra los mapeos en Base.metadata)


def build_engine(url: str):
    """Crea el engine aplicando el mismo ajuste psycopg3 que usa app/database.py."""
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(url, pool_pre_ping=True)


def count_rows(conn, table) -> int:
    return conn.execute(select(text("count(*)")).select_from(table)).scalar_one()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--source",
        default=f"sqlite:///{(BACKEND_ROOT / 'tacticsphere.db').as_posix()}",
        help="URL de origen (por defecto la SQLite del repo)",
    )
    ap.add_argument(
        "--target",
        default=os.getenv("TARGET_DATABASE_URL"),
        help="URL de destino Postgres (o variable TARGET_DATABASE_URL)",
    )
    ap.add_argument("--dry-run", action="store_true", help="Solo reporta, no escribe")
    ap.add_argument("--batch", type=int, default=500, help="Filas por lote")
    ap.add_argument(
        "--force",
        action="store_true",
        help="Permite escribir aunque el destino ya tenga filas",
    )
    ap.add_argument(
        "--skip-orphans",
        action="store_true",
        help=(
            "Descarta filas cuya clave foranea apunta a un registro inexistente. "
            "SQLite no valida FK, asi que el origen puede arrastrar huerfanas que "
            "Postgres si rechaza."
        ),
    )
    args = ap.parse_args()

    if not args.dry_run and not args.target:
        ap.error("falta --target (o TARGET_DATABASE_URL). Usa --dry-run para ensayar.")

    src = build_engine(args.source)
    print(f"Origen : {src.url}")

    tables = Base.metadata.sorted_tables

    # --- Inventario del origen ---
    with src.connect() as sconn:
        counts = {}
        for t in tables:
            try:
                counts[t.name] = count_rows(sconn, t)
            except Exception as e:
                counts[t.name] = None
                print(f"  [AVISO] no se pudo leer {t.name}: {str(e)[:120]}")

    total = sum(c for c in counts.values() if c)
    print(f"\nTablas en el modelo: {len(tables)} | filas totales en origen: {total}")
    for t in tables:
        c = counts.get(t.name)
        print(f"  {t.name:<28} {'ERR' if c is None else c:>7}")

    if args.dry_run:
        print("\n[DRY-RUN] No se escribio nada. Ejecuta con --target para restaurar.")
        return 0

    tgt = build_engine(args.target)
    # No imprimimos la URL completa: lleva credenciales.
    print(f"\nDestino: {tgt.url.render_as_string(hide_password=True)}")

    # --- Crear esquema si hace falta ---
    print("Creando tablas que falten en el destino...")
    Base.metadata.create_all(bind=tgt)

    # --- Chequeo de seguridad: destino vacio ---
    with tgt.connect() as tconn:
        no_vacias = {}
        for t in tables:
            try:
                n = count_rows(tconn, t)
                if n:
                    no_vacias[t.name] = n
            except Exception:
                pass
    if no_vacias and not args.force:
        print("\n[ABORTADO] El destino ya tiene datos:")
        for name, n in no_vacias.items():
            print(f"  {name}: {n} filas")
        print("Usa --force solo si estas seguro de querer mezclar datos.")
        return 1

    # --- Copia tabla por tabla, en orden de dependencias ---
    copiadas = 0
    descartadas = []
    with src.connect() as sconn, tgt.begin() as tconn:
        for t in tables:
            rows = [dict(r) for r in sconn.execute(select(t)).mappings()]
            if not rows:
                print(f"  {t.name:<28} vacia, se omite")
                continue

            if args.skip_orphans:
                # Recorremos en orden topologico, asi que los padres ya estan en
                # el destino y se pueden consultar directamente.
                for fk in t.foreign_keys:
                    hijo = fk.parent.name
                    padre_col, padre_tabla = fk.column.name, fk.column.table
                    validos = set(
                        tconn.execute(select(padre_tabla.c[padre_col])).scalars()
                    )
                    antes = len(rows)
                    rows = [
                        r for r in rows if r.get(hijo) is None or r[hijo] in validos
                    ]
                    if len(rows) < antes:
                        descartadas.append(
                            f"{t.name}.{hijo} -> {padre_tabla.name}.{padre_col}: "
                            f"{antes - len(rows)} fila(s) huerfana(s)"
                        )

            if not rows:
                print(f"  {t.name:<28} sin filas validas, se omite")
                continue
            for i in range(0, len(rows), args.batch):
                tconn.execute(t.insert(), rows[i : i + args.batch])
            copiadas += len(rows)
            print(f"  {t.name:<28} {len(rows):>7} filas copiadas")

    # --- Reiniciar secuencias de Postgres ---
    if tgt.dialect.name == "postgresql":
        print("\nReiniciando secuencias...")
        with tgt.begin() as tconn:
            for t in tables:
                if "id" not in t.c:
                    continue
                tconn.execute(
                    text(
                        "SELECT setval("
                        "  pg_get_serial_sequence(:tabla, 'id'),"
                        "  COALESCE((SELECT MAX(id) FROM " + t.name + "), 1),"
                        "  (SELECT MAX(id) IS NOT NULL FROM " + t.name + ")"
                        ")"
                    ).bindparams(tabla=t.name)
                )
        print("[OK] Secuencias alineadas al MAX(id) de cada tabla.")

    if descartadas:
        print("\n[AVISO] Filas descartadas por clave foranea rota en el origen:")
        for d in descartadas:
            print(f"  - {d}")

    print(f"\n[OK] Restauracion completada: {copiadas} filas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
