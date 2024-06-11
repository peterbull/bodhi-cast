import logging
import os

import pendulum
from airflow.decorators import dag, task
from extensions.models.models import create_tables
from extensions.utils.db_config import LOCAL_PG_URI, SUPABASE_PG_URI
from extensions.utils.sl_data import SpotsForecast, SpotsGetter

# db_uri = LOCAL_PG_URI
# Have to declare it this way for now
# the parser is giving an error on initial load
# using environ directly seems to fix it
db_uri = os.environ.get("SUPABASE_PG_URI")

start_date = pendulum.datetime(2024, 6, 9)

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


@dag(
    dag_id="sl_data_etl",
    start_date=start_date,
    schedule="@daily",
    catchup=False,
    is_paused_upon_creation=False,
)
def taskflow():
    @task()
    def handle_create_tables():
        create_tables()

    @task()
    def get_new_spots():
        sl_spots = SpotsGetter(db_uri)
        sl_spots.run()

    @task()
    def get_wave_ratings():
        sl_ratings = SpotsForecast(db_uri)
        sl_ratings.run()

    handle_create_tables() >> get_new_spots() >> get_wave_ratings()


dag_run = taskflow()
