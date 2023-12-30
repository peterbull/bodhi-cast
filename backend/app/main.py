import json
from datetime import datetime, timedelta

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import extract, select, text, and_
from sqlalchemy.orm import Session

import redis

from celery import Celery
from celery.schedules import crontab

from app.db.database import get_db, create_tables, engine, add_spots
from app.data.noaa.wavewatch import Wavewatch
from app.models.models import Spots, WaveForecast


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
        'task': 'app.main.noaa_sample',
        'args': (24,),
        # Runs daily at 7am UTC 2am EST
        'schedule': crontab(minute='0', hour='7'),
        # 'schedule': crontab(minute='17', hour='19'), # Variable debug run
    }
}
# Add spots to spots table
add_spots()
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
                step,
                AVG(swell) as avg_swell
            FROM wave_forecast
            WHERE valid_time >= :date
            GROUP BY ST_SnapToGrid(location::geometry, :degrees), valid_time, step
            ORDER BY ST_SnapToGrid(location::geometry, :degrees), valid_time;
            """),
            {"date": date, "degrees": int(degrees)})

        rows = result.all()
        # Group forecasts by valid_time
        forecasts_by_time = []
        for row in rows:
            valid_time_str = row.valid_time.isoformat()
            forecast_data = next(
                (item for item in forecasts_by_time if item["time"] == valid_time_str), None)
            if not forecast_data:
                forecast_data = {
                    "time": valid_time_str,
                    "step": row.step.total_seconds(),
                    "maxSwell": row.avg_swell or 0,
                    "locations": []
                }
                forecasts_by_time.append(forecast_data)
            forecast = {"lon": row.lon, "lat": row.lat, "swell": row.avg_swell}
            forecast_data["locations"].append(forecast)
            if row.avg_swell is not None:
                forecast_data["maxSwell"] = max(
                    forecast_data["maxSwell"] or 0, row.avg_swell)

        redis_client.set(cache_key, json.dumps(forecasts_by_time), ex=86400)

        return forecasts_by_time


@app.get("/forecasts/swell")
def get_swell_forecasts(db: Session = Depends(get_db)):
    result = db.execute(text(
        """
        SELECT
            latitude, longitude, valid_time, step, swell
        FROM wave_forecast
        WHERE swell IS NOT NULL
        ORDER BY valid_time;
        """
    ))
    rows = result.all()
    return [row._asdict for row in rows]

# Get wave forecast data if points fall within a given bounding box


@app.get("/forecasts/tiles/{date}/{lat}/{lng}/{zoom}")
def get_forecasts_by_tile(date: str, lat: str, lng: str, zoom: str, db: Session = Depends(get_db)):
    date = datetime.strptime(date, "%Y%m%d").date()
    # To do: Find an equation that returns proportionally at all zoom levels
    # Current: A placeholder that will only really work with values near the default `zoom`
    zoom_factor = float(zoom) / 7.5
    lat_min = float(lat) - (zoom_factor / 2)
    lat_max = float(lat) + (zoom_factor / 2)
    lng_min = float(lng) - zoom_factor
    lng_max = float(lng) + zoom_factor
    result = db.execute(text(
        """SELECT *
        FROM wave_forecast
        WHERE
            location::geometry && ST_MakeEnvelope(:lng_min, :lat_min, :lng_max, :lat_max, 4326)
            AND ST_Intersects(
                location::geometry,
                ST_MakeEnvelope(:lng_min, :lat_min, :lng_max, :lat_max, 4326));
                """),
        {"lng_min": lng_min, "lat_min": lat_min, "lng_max": lng_max, "lat_max": lat_max})
    rows = result.all()
    return [row._asdict() for row in rows]

# Find the nearest point in the db to the spot, then return all forecast items for that day
# Swell is null at landlocked areas, so excluding it ensures the selected point is at sea


@app.get("/forecasts/spots/{date}/{spot_lat}/{spot_lng}/")
def get_forecasts_by_spot(date: str, spot_lat: str, spot_lng: str, db: Session = Depends(get_db)):
    date = datetime.strptime(date, "%Y%m%d").date()
    next_day = date + timedelta(days=1)
    spot_lat = float(spot_lat)
    spot_lng = float(spot_lng)

    sql = text("""
        WITH closest_point AS (
            SELECT latitude, longitude
            FROM wave_forecast
            WHERE
                valid_time >= :date
                AND valid_time < :next_day
                AND swh IS NOT NULL
            ORDER BY ST_Distance(
                ST_MakePoint(longitude, latitude),
                ST_MakePoint(:spot_lng, :spot_lat)
            )
            LIMIT 1
        )
        SELECT id, location, time, valid_time, COALESCE(swh, 0) as swh, COALESCE(perpw, 0) as perpw, COALESCE(dirpw, 0) as dirpw,
            COALESCE(swell, 0) as swell, COALESCE(swper, 0) as swper, COALESCE(shww, 0) as shww,
            COALESCE(mpww, 0) as mpww, COALESCE(wvdir, 0) as wvdir, COALESCE(ws, 0) as ws, COALESCE(wdir, 0) as wdir,
           latitude, longitude
        FROM wave_forecast
        WHERE
            valid_time >= :date
            AND valid_time < :next_day
            AND swell IS NOT NULL
            AND latitude = (SELECT latitude FROM closest_point)
            AND longitude = (SELECT longitude FROM closest_point)
        ORDER BY valid_time;
    """)

    result = db.execute(sql, {"date": date, "next_day": next_day,
                        "spot_lat": spot_lat, "spot_lng": spot_lng})

    rows = result.all()
    return [row._asdict() for row in rows]

# Get all spots


@app.get("/spots")
def get_all_spots(db: Session = Depends(get_db)):
    spots = db.query(Spots).all()
    return [spot.as_dict() for spot in spots]

# Celery Worker Status


@app.get("/worker-status")
def get_worker_status():
    i = celery_app.control.inspect()
    return {
        "active": i.active(),
        "scheduled": i.scheduled(),
        "reserved": i.reserved()
    }
