from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import extract
from sqlalchemy.orm import Session
from celery import Celery
from celery.schedules import crontab

from app.db.database import get_db, create_tables, engine
from app.models.models import SwellData
from app.utils.fetch_data import fetch_data, parse_swell_data, save_swell_data, all_wave_forecasts_to_db



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

celery_app.conf.broker_connection_retry_on_startup = True

celery_app.conf.beat_schedule = {
    'fetch-and-commit-open-meteo-data-every-hour': {
        'task': 'app.main.update_swell_data',
        'schedule': crontab(minute='0', hour='*'),
        # 'schedule': crontab(minute='*'), # crontab(minute=*) for every minute debug
    },
    'fetch-transform-commit-noaa-data-daily': {
        'task': 'app.main.noaa_update',
        'schedule': crontab(minute='0', hour='7'), # Runs daily at 7am UTC 2am EST
        # 'schedule': crontab(minute='17', hour='19'), # Variable debug run
    }
}

# Celery tasks
@celery_app.task
def update_swell_data():
    json_data = fetch_data()
    parsed_data = parse_swell_data(json_data)
    save_swell_data(parsed_data)

@celery_app.task
def noaa_update():
    all_wave_forecasts_to_db(engine, 'wave_forecast')


# Routes
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

@app.get("/swelldata/{year}/{month}/{day}/{hour}")
def swell_data_by_date(year: int, month: int, day: int, hour: int, db: Session = Depends(get_db)):
    data = db.query(SwellData).filter(
        extract('year', SwellData.hourly) == year,
        extract('month', SwellData.hourly) == month,
        extract('day', SwellData.hourly) == day,
        extract('hour', SwellData.hourly) == hour
        ).all()
    return data

# Celery Worker
@app.get("/worker-status")
def get_worker_status():
    i = celery_app.control.inspect()
    return {
        "active": i.active(),
        "scheduled": i.scheduled(),
        "reserved": i.reserved()
    }