from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.future import select
from db.database import init_db, get_db
from models.models import SwellData
import uvicorn


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the database before the application starts receiving requests
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/surf_data")
async def read_surf_data(db: Session = Depends(get_db)):
    result = await db.execute(select(SwellData))
    data = result.scalars().all()  # Accessing the results synchronously
    return data


if __name__ == "__main__":
    # Changed it from app to 'main:app' to reload changes automatically.
    uvicorn.run('main:app', host="localhost", port=8080, reload=True)
