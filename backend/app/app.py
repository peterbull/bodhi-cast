from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select

DATABASE_URL = "postgresql://postgres:your_password@localhost/surfing_data"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

app = FastAPI()


@app.get("/surf_data")
async def read_surf_data(db: Session = Depends(get_db)):
    result = await db.execute(select(SurfData))
    return result.scalars().all()