import json
from datetime import datetime

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import extract, select, text
from sqlalchemy.orm import Session

import redis

from celery import Celery
from celery.schedules import crontab

from app.db.database import get_db, create_tables, engine
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

redis_client = redis.Redis(host='redis', port=6379, db=0)

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
def noaa_sample(num_samples=1):
    Wavewatch(engine, 'wave_forecast').run_sample(num_samples=num_samples)


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

    result = db.execute(
        sql_query, {"date": format_date(date)}).mappings().first()

    if result is not None:
        return result
    else:
        return {}


@app.get("/locations/{date}")
def get_locations(date: str, db: Session = Depends(get_db)):
    date = datetime.strptime(date, "%Y%m%d").date()
    result = db.execute(text(
        """
        SELECT ST_X(location::geometry) AS lon, ST_Y(location::geometry) AS
        lat, swell FROM wave_forecast WHERE valid_time = :date;
        """),
        {"date": date})

    rows = result.all()
    locations = [row._asdict() for row in rows]

    result = db.execute(text(
        """
        SELECT MAX(swell) AS max_swell FROM wave_forecast
        WHERE valid_time = :date;
        """),
        {"date": date})

    max_swell = result.scalar()

    return {"locations": locations, "maxSwell": max_swell}


@app.get("/locations/gridded/{degrees}/{date}")
def get_locations_gridded(date: str, degrees: str, db: Session = Depends(get_db)):
    date = datetime.strptime(date, "%Y%m%d").date()
    result = db.execute(text(
        """
        SELECT
            ST_X(ST_SnapToGrid(location::geometry, :degrees)) AS lon,
            ST_Y(ST_SnapToGrid(location::geometry, :degrees)) AS lat,
            AVG(swell) as avg_swell
        FROM wave_forecast WHERE valid_time = :date GROUP BY
        ST_SnapToGrid(location::geometry, :degrees);
        """),
        {"date": date, "degrees": int(degrees)})

    rows = result.all()
    locations = [row._asdict() for row in rows]

    result = db.execute(text(
        """
        SELECT MAX(swell) AS max_swell FROM wave_forecast
        WHERE valid_time = :date;
        """),
        {"date": date})

    max_swell = result.scalar()

    return {"locations": locations, "maxSwell": max_swell}


@app.get("/forecasts/gridded/{degrees}/{date}")
def get_forecasts_gridded(date: str, degrees: str, db: Session = Depends(get_db)):
    cache_key = f"forecasts_gridded:{date}:{degrees}"
    cached_result = redis_client.get(cache_key)

    if cached_result is not None:
        return json.loads(cached_result.decode("utf-8"))
    else:
        date = datetime.strptime(date, "%Y%m%d").date()
        result = db.execute(text(
            """
            SELECT
                ST_X(ST_SnapToGrid(location::geometry, :degrees)) AS lon,
                ST_Y(ST_SnapToGrid(location::geometry, :degrees)) AS lat,
                valid_time,
                AVG(swell) as avg_swell
            FROM wave_forecast
            WHERE valid_time >= :date
            GROUP BY ST_SnapToGrid(location::geometry, :degrees), valid_time
            ORDER BY ST_SnapToGrid(location::geometry, :degrees), valid_time;
            """),
            {"date": date, "degrees": int(degrees)})

        rows = result.all()
        # Group forecasts by valid_time
        forecasts_by_time = {}
        for row in rows:
            valid_time_str = row.valid_time.isoformat()
            if valid_time_str not in forecasts_by_time:
                forecasts_by_time[valid_time_str] = {
                    "locations": [],
                    "maxSwell": 0
                }
            forecast = {"lon": row.lon, "lat": row.lat,
                        "swell": row.avg_swell}
            forecasts_by_time[valid_time_str]["locations"].append(forecast)
            forecasts_by_time[valid_time_str]["maxSwell"] = max(
                forecasts_by_time[valid_time_str]["maxSwell"], row.avg_swell)

        redis_client.set(cache_key, json.dumps(forecasts_by_time), ex=86400)

        return forecasts_by_time


# Celery Worker Status


@app.get("/worker-status")
def get_worker_status():
    i = celery_app.control.inspect()
    return {
        "active": i.active(),
        "scheduled": i.scheduled(),
        "reserved": i.reserved()
    }
