import logging
import os

import pendulum
from airflow.decorators import dag, task
from extensions.models.models import create_tables
from extensions.utils.db_config import LOCAL_PG_URI
from extensions.utils.sl_data import SpotsForecast, SpotsGetter

create_tables()
db_uri = LOCAL_PG_URI

start_date = pendulum.datetime(2024, 2, 6)

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "start_date": start_date,
    "email": ["your-email@example.com"],
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": pendulum.duration(minutes=5),
}


@dag(start_date=start_date, schedule="@daily")
def taskflow():
    sl_spots = SpotsGetter(db_uri)
    sl_ratings = SpotsForecast(db_uri)

    @task()
    def get_new_spots():
        sl_spots.run()

    @task()
    def get_wave_ratings():
        sl_ratings.run()

    get_new_spots() >> get_wave_ratings()


dag_run = taskflow()
