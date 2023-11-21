from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import extract
from sqlalchemy.orm import Session
from celery import Celery
from celery.schedules import crontab

from app.db.database import get_db, create_tables
from app.models.models import SwellData
from app.utils.fetch_data import fetch_data, parse_swell_data, save_swell_data



create_tables()
db = get_db()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

celery_app = Celery(
    "tasks",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/0"
)

celery_app.conf.beat_schedule = {
    'fetch-and-save-swell-data-every-minute': {
        'task': 'app.main.update_swell_data',
        'schedule': crontab(minute='0', hour='*'),
        # 'schedule': crontab(minute='*'), # crontab(minute=*) for every minute debug
    },
}

# celery test function
@celery_app.task
def test_celery(word:str) -> str:
    return f"test task returns {word}"

@celery_app.task
def update_swell_data():
    json_data = fetch_data()
    parsed_data = parse_swell_data(json_data)
    save_swell_data(parsed_data)

@app.get("/")
def read_root():
    return {"Hello": "World"}
    
@app.get("/swelldata")
def read_swell_data(db: Session = Depends(get_db)):
    data = db.query(SwellData).all()
    return data

@app.get("/swelldata/{year}/{month}/{day}")
def swell_data_by_date(year: int, month: int, day: int, db: Session = Depends(get_db)):
    data = db.query(SwellData).filter(
        extract('year', SwellData.hourly) == year,
        extract('month', SwellData.hourly) == month,
        extract('day', SwellData.hourly) == day
        ).all()
    return data


# testing celery
@app.get("/test_celery/{word}")
def test_celery_endpoint(word: str):
    task = test_celery.delay(word)
    return {"task_id": task.id}

@app.get("/fetch_task/{task_id}")
def fetch_task_result(task_id: str):
    task = celery_app.AsyncResult(task_id)
    if task.ready():
        return {"status": task.status, "result": task.result}
    return {"status": task.status}