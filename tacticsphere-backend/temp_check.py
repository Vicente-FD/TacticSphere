from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app import models
engine = create_engine('sqlite:///tacticsphere.db')
with Session(engine) as session:
    rows = session.execute(select(models.Pregunta).where(models.Pregunta.pilar_id == 1)).scalars().all()
    for row in rows:
        print(row.id, repr(row.enunciado))

