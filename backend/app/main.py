import json
import os
from datetime import datetime, timedelta

import redis
from app.db.database import add_spots, create_tables, get_db
from app.models.models import Spots
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

create_tables()
db = get_db()
app = FastAPI()

allowed_origins = os.getenv("ALLOWED_ORIGINS").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],  # Allows all headers
)

# # Configure redis
redis_password = os.getenv("REDIS_PASSWORD")
redis_client = redis.Redis(host="redis", port=6379, db=0, password=redis_password)


# Add spots to spots table
add_spots()


# Datetime conversion class for writing json to redis
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super(DateTimeEncoder, self).default(obj)


# Routes
@app.get("/")
def read_root():
    return {"Hello": "Bodhi", "Big Dog": "Rosie"}


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
    # Create unique key for this set of params and try to get results from redis
    key = f"forecasts_by_tile:{date}:{lat}:{lng}:{zoom}"
    result = redis_client.get(key)

    # If it is not cached in redis, run the query as normal
    if result is not None:
        return json.loads(result)
    else:
        date = datetime.strptime(date, "%Y%m%d").date()
        next_day = date + timedelta(days=1)
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
                """SELECT swh
            FROM wave_forecast
            WHERE
                location::geometry && ST_MakeEnvelope(:lng_min, :lat_min, :lng_max, :lat_max, 4326)
                AND ST_Intersects(
                    location::geometry,
                    ST_MakeEnvelope(:lng_min, :lat_min, :lng_max, :lat_max, 4326))
                AND valid_time >= :date
                AND time >= :date
                AND valid_time < :next_day
                AND time < :next_day
                AND swh IS NOT NULL;
                    """
            ),
            {
                "lng_min": lng_min,
                "lat_min": lat_min,
                "lng_max": lng_max,
                "lat_max": lat_max,
                "date": date,
                "next_day": next_day,
            },
        )
        rows = result.all()
        forecasts = [row._asdict() for row in rows]

        redis_client.set(key, json.dumps(forecasts, cls=DateTimeEncoder), ex=timedelta(hours=1))

        return forecasts


@app.get("/forecasts/spots/{date}/{spot_lat}/{spot_lng}")
def get_forecasts_by_spot(date: str, spot_lat: str, spot_lng: str, db: Session = Depends(get_db)):
    """
    Retrieve wave forecasts for a specific spot based on date and coordinates.

    - This function creates a PostGIS point using the provided latitude (spot_lat) and longitude
      (spot_lng) as the origin.
    - It then calculates the nearest data point by distance to this origin.
    - Forecasts where significant combined swell and wind wave height (swh) values
      are null are excluded, as null values indicate land areas rather than water.
    - Additional logic will need to be added to handle rolling forecast updates
      if fetching from NOAA multiple times per day

    Args:
        date (str): The date in the format 'YYYYMMDD'.
        spot_lat (str): The latitude of the spot.
        spot_lng (str): The longitude of the spot.
        db (Session, optional): The database session. Defaults to Depends(get_db).

    Returns:
        list: A list of dictionaries containing the forecast data for each valid time.
    """

    # Create unique key for this set of params and try to get results from redis
    key = f"forecasts_by_spot:{date}:{spot_lat}:{spot_lng}"
    result = redis_client.get(key)

    # If it is not cached in redis, run the query as normal
    if result is not None:
        return json.loads(result)
    else:
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
                    AND time >= :date
                    AND valid_time < :next_day
                    AND time < :next_day
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
                AND time >= :date
                AND valid_time < :next_day
                AND time < :next_day
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
        forecasts = [row._asdict() for row in rows]

        redis_client.set(key, json.dumps(forecasts, cls=DateTimeEncoder), ex=timedelta(hours=1))

        return forecasts


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
