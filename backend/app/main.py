from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import extract, func
from sqlalchemy.orm import Session
from celery import Celery
from celery.schedules import crontab

from app.db.database import get_db, create_tables, engine
from app.models.models import WaveForecast
from app.data.noaa.wavewatch import Wavewatch



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
    'fetch-transform-commit-noaa-data-daily': {
        'task': 'app.main.noaa_update',
        'schedule': crontab(minute='0', hour='7'), # Runs daily at 7am UTC 2am EST
        # 'schedule': crontab(minute='17', hour='19'), # Variable debug run
    }
}

# Celery tasks
@celery_app.task
def noaa_update():
    Wavewatch(engine, 'wave_forecast').run()


# Routes
@app.get("/")
def read_root():
    return {"Hello": "World"}


# Test fetching NOAA data
@app.get("/waveforecast/{lat}/{lon}")
def wave_forecast_by_location(lat: float, lon: float, db: Session = Depends(get_db)):
    data = db.query(WaveForecast).order_by(WaveForecast.id).limit(20).all()
    return data


# Celery Worker Status
@app.get("/worker-status")
def get_worker_status():
    i = celery_app.control.inspect()
    return {
        "active": i.active(),
        "scheduled": i.scheduled(),
        "reserved": i.reserved()
    }