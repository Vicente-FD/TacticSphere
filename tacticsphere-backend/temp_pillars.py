from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app import models
engine = create_engine('sqlite:///tacticsphere.db')
with Session(engine) as session:
    pillars = session.execute(select(models.Pilar)).scalars().all()
    for pil in pillars:
        print(pil.id, pil.nombre)

