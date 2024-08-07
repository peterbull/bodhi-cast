import logging
import os

import pendulum
from airflow.decorators import task
from app.models.models import StationInventory
from geoalchemy2 import WKTElement
from noaa_coops import Station, get_stations_from_bbox
from sqlalchemy import create_engine, update
from sqlalchemy.orm import sessionmaker

from airflow import DAG

DATABASE_URL = os.environ.get("AIRFLOW__DATABASE__SQL_ALCHEMY_CONN")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine, autocommit=False, autoflush=False)

start_date = pendulum.datetime(2024, 1, 1)

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "start_date": start_date,
    "email": ["your-email@example.com"],
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 5,
    "retry_delay": pendulum.duration(minutes=5),
}


def update_station_inventory(db, station_inventory, station, data_mapping):
    station_inventory.has_water_level = False
    station_inventory.has_wind = False
    station_inventory.has_air_temperature = False

    station_inventory.station_id = int(station.id)
    station_inventory.latitude = station.lat_lon["lat"]
    station_inventory.longitude = station.lat_lon["lon"]

    # check for the existence of each key in the data mapping
    for key in station.data_inventory:
        mapped_field = data_mapping.get(key)
        if mapped_field:
            # if the key is found, set corresponding attribute to True
            setattr(station_inventory, mapped_field, True)

    db.add(station_inventory)


with DAG(
    "update_noaa_station_inventory",
    default_args=default_args,
    description="Cycle through NOAA COOPS station list and append any new stations and inventory data to postgis table",
    schedule="0 6 * * *",
    catchup=False,
    is_paused_upon_creation=False,
) as dag:

    data_mapping = {
        "Wind": "has_wind",
        "Preliminary 6-Minute Water Level": "has_water_level",
        "Air Temperature": "has_air_temperature",
    }

    @task
    def batch_update_stations(data_mapping):
        db = Session()
        try:
            # Get a list of all station ids available from NOAA COOPS
            stations = get_stations_from_bbox(lat_coords=[-90, 90], lon_coords=[-180, 180])

            # Get ids of stations currently in db
            station_ids = db.query(StationInventory.station_id).all()
            station_ids_list = [id[0] for id in station_ids]

            # Create a list of available stations not in db
            new_stations = [station for station in stations if int(station) not in station_ids_list]

            for x in new_stations:
                x = Station(id=x)
                station_inventory = StationInventory()
                if hasattr(x, "data_inventory"):
                    update_station_inventory(db, station_inventory, x, data_mapping)
                    db.commit()
                    logging.info(f"Added station number: {x.id}")
                else:
                    logging.info(f"No data inventory for station: {x.id}")
        except Exception as e:
            logging.error(f"Error updating station inventory: {e}")
        finally:
            db.close()
            logging.info("All stations successfully committed to db")

    @task
    def pts_from_lat_lng():
        # Add postgis points for each row
        db = Session()
        try:
            rows = db.query(StationInventory).filter(StationInventory.location.is_(None))

            for row in rows:
                point = "POINT({} {})".format(row.longitude, row.latitude)

                db.execute(
                    update(StationInventory)
                    .where(StationInventory.station_id == row.station_id)
                    .values(location=WKTElement(point, srid=4326))
                )
            db.commit()
            logging.info(f"Updated {point}")
        except Exception as e:
            logging.error(f"Error creating point: {e}")
        finally:
            db.close()
            logging.info("Database session closed")

    new_stations = batch_update_stations(data_mapping)
    updated_db_entries = pts_from_lat_lng()

    new_stations >> updated_db_entries
