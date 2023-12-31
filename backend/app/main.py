from datetime import datetime, timedelta

import redis
from app.data.noaa.wavewatch import Wavewatch
from app.db.database import add_spots, create_tables, engine, get_db
from app.models.models import Spots
from celery import Celery
from celery.schedules import crontab
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

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

# Configure redis
redis_client = redis.Redis(host="redis", port=6379, db=0)

# Configure celery
celery_app = Celery("tasks", broker="redis://redis:6379/0", backend="redis://redis:6379/0")

celery_app.conf.broker_connection_retry_on_startup = True

# Schedule celery tasks with celery-beat
celery_app.conf.beat_schedule = {
    "fetch-transform-commit-noaa-data-daily": {
        "task": "app.main.noaa_sample",
        "args": (24,),
        # Runs daily at 7:00 UTC 2:00am EST
        "schedule": crontab(minute="0", hour="7"),
    }
}

# Add spots to spots table
add_spots()


# Define celery tasks


@celery_app.task
def noaa_update():
    """
    Updates the Wavewatch data for wave_forecast.

    This function fetches all available forecast periods, which forecast
    out 16 days. This can be about 23 gigs of data so keep storage and compute in mind when running.
    """
    Wavewatch(engine, "wave_forecast").run()


@celery_app.task
def noaa_sample(num_samples=1):
    """
    Updates the Wavewatch data for wave_forecast by number of samples.

    Parameters:
    num_samples (int): The number of forecast samples to fetch. Each sample represents a forecast
    for a specific time interval. Default value is 1.

    Details:
    - For the first 10 days of a forecast, data is provided at 3-hour intervals.
    (1 Day == 8 Samples)
    - From day 11 to day 16, data is provided at 6-hour intervals.
    (1 Day == 4 Samples)

    """
    Wavewatch(engine, "wave_forecast").run_sample(num_samples=num_samples)


# Routes
@app.get("/")
def read_root():
    return {"Hello": "Surf"}


# Get wave forecast data if points fall within a given bounding box


@app.get("/forecasts/tiles/{date}/{lat}/{lng}/{zoom}")
def get_forecasts_by_tile(date: str, lat: str, lng: str, zoom: str, db: Session = Depends(get_db)):
    """
    Retrieve wave forecasts for a specific tile based on date, latitude, longitude, and zoom level.

    PostGIS is used to create a bounding box at calculated offets based on zoom from the orign
    point(lat,lng) and return all data points that fall within the bounding box.

    Args:
        date (str): The date of the forecasts in the format 'YYYYMMDD'.
        lat (str): The latitude of the tile.
        lng (str): The longitude of the tile.
        zoom (str): The zoom level of the tile.
        db (Session, optional): The database session. Defaults to Depends(get_db).

    Returns:
        list: A list of dictionaries representing the wave forecasts for the tile.
    """
    date = datetime.strptime(date, "%Y%m%d").date()
    # To do: Find an equation that returns proportionally at all zoom levels after deciding on
    #        final map and corresponding projection and pixel size
    # Current: A placeholder that will only work with values near the default `zoom`
    zoom_factor = float(zoom) / 7.5
    lat_min = float(lat) - (zoom_factor / 2)
    lat_max = float(lat) + (zoom_factor / 2)
    lng_min = float(lng) - zoom_factor
    lng_max = float(lng) + zoom_factor
    result = db.execute(
        text(
            """SELECT *
        FROM wave_forecast
        WHERE
            location::geometry && ST_MakeEnvelope(:lng_min, :lat_min, :lng_max, :lat_max, 4326)
            AND ST_Intersects(
                location::geometry,
                ST_MakeEnvelope(:lng_min, :lat_min, :lng_max, :lat_max, 4326));
                """
        ),
        {"lng_min": lng_min, "lat_min": lat_min, "lng_max": lng_max, "lat_max": lat_max},
    )
    rows = result.all()
    return [row._asdict() for row in rows]


@app.get("/forecasts/spots/{date}/{spot_lat}/{spot_lng}/")
def get_forecasts_by_spot(date: str, spot_lat: str, spot_lng: str, db: Session = Depends(get_db)):
    """
    Retrieve wave forecasts for a specific spot based on date and coordinates.

    - This function creates a PostGIS point using the provided latitude (spot_lat) and longitude
      (spot_lng) as the origin.
    - It then calculates the nearest data point by distance to this origin.
    - Forecasts where significant combined swell and wind wave height (swh) values
      are null are excluded, as null values indicate land areas rather than water.

    Args:
        date (str): The date in the format 'YYYYMMDD'.
        spot_lat (str): The latitude of the spot.
        spot_lng (str): The longitude of the spot.
        db (Session, optional): The database session. Defaults to Depends(get_db).

    Returns:
        list: A list of dictionaries containing the forecast data for each valid time.
    """
    date = datetime.strptime(date, "%Y%m%d").date()
    next_day = date + timedelta(days=1)
    spot_lat = float(spot_lat)
    spot_lng = float(spot_lng)

    sql = text(
        """
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
    """
    )

    result = db.execute(
        sql, {"date": date, "next_day": next_day, "spot_lat": spot_lat, "spot_lng": spot_lng}
    )

    rows = result.all()
    return [row._asdict() for row in rows]


# Get all spots


@app.get("/spots")
def get_all_spots(db: Session = Depends(get_db)):
    """
    Retrieve all spots from the database.

    Parameters:
    - db: The database session.

    Returns:
    - A list of dictionaries representing each spot.
    """
    spots = db.query(Spots).all()
    return [spot.as_dict() for spot in spots]


# Celery Worker Status


@app.get("/worker-status")
def get_worker_status():
    """
    Retrieve the status of the worker.

    Returns:
        dict: A dictionary containing the number of active, scheduled, and reserved tasks.
    """
    i = celery_app.control.inspect()
    return {"active": i.active(), "scheduled": i.scheduled(), "reserved": i.reserved()}
