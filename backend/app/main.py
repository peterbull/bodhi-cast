from datetime import datetime

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import extract, func, select, text
from sqlalchemy.orm import Session
from celery import Celery
from celery.schedules import crontab

from app.db.database import get_db, create_tables, engine
from app.models.models import WaveForecast
from app.data.noaa.wavewatch import Wavewatch
from sqlalchemy.orm import Session
from app.models.models import WaveForecast
from sqlalchemy.orm import Session


create_tables()
# db = get_db()
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
        # Runs daily at 7am UTC 2am EST
        'schedule': crontab(minute='0', hour='7'),
        # 'schedule': crontab(minute='17', hour='19'), # Variable debug run
    }
}

# Celery tasks


@celery_app.task
def noaa_update():
    Wavewatch(engine, 'wave_forecast').run()


@celery_app.task
def noaa_sample():
    Wavewatch(engine, 'wave_forecast').run_sample()


@celery_app.task
def noaa_update_swell_only():
    Wavewatch(engine, 'wave_forecast').run(swell_only=True)


@celery_app.task
def noaa_sample_swell_only():
    Wavewatch(engine, 'wave_forecast').run_sample(swell_only=True)


# Routes
@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/waveforecast/{datatype}/{date}")
def datatype_forecast_by_date(datatype: str, date: int, db: Session = Depends(get_db)):

    def format_date(date_int: int) -> str:
        date_obj = datetime.strptime(str(date_int), "%Y%m%d")
        formatted_date = date_obj.strftime("%Y-%m-%d %H:%M:%S+00")
        return formatted_date

    sql_query = text(f"""
    SELECT COALESCE({datatype}, 0) as {datatype}, latitude, longitude
    FROM wave_forecast
    WHERE valid_time = :date AND (latitude < 80 OR latitude > -80)
    """)

    result = db.execute(sql_query, {"date": format_date(date)}).mappings().first()

    if result is not None:
        return result
    else:
        return {}



# Celery Worker Status
@app.get("/worker-status")
def get_worker_status():
    i = celery_app.control.inspect()
    return {
        "active": i.active(),
        "scheduled": i.scheduled(),
        "reserved": i.reserved()
    }
