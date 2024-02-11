import logging
import os

import pendulum
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError

from airflow import DAG

DATABASE_URL = os.environ.get("AIRFLOW__DATABASE__SQL_ALCHEMY_CONN")
engine = create_engine(DATABASE_URL)

start_date = pendulum.datetime(2025, 1, 1)

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

with DAG(
    "update_noaa_station_inventory",
    default_args=default_args,
    description="Cycle through NOAA COOPS station list and append any new stations and inventory data to postgis table",
    schedule="None",
    catchup=False,
):
    pass
