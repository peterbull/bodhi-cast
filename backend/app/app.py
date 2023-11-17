from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from db.models import Base

DATABASE_URL = "postgresql://postgres:your_password@localhost:5433/surfing_data"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(engine)

app = FastAPI()


@app.get("/surf_data")
async def read_surf_data(db: Session = Depends(get_db)):
    result = await db.execute(select(SurfData))
    return result.scalars().all()