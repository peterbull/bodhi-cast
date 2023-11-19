from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from celery import Celery

from app.db.database import get_db, create_tables
from app.models.models import SwellData



create_tables()
db = get_db()
app = FastAPI()

celery_app = Celery(
    "worker",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/0"
)

@celery_app.task
def test_celery(word:str) -> str:
    return f"test task returns {word}"

@app.get("/")
def read_root():
    return {"Hello": "World"}
    
@app.get("/swelldata")
def read_swell_data(db: Session = Depends(get_db)):
    data = db.query(SwellData).all()
    return data
