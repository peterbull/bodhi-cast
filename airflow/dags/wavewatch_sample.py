from airflow import DAG
from airflow.decorators import task
from datetime import datetime, timedelta
from sqlalchemy import create_engine

from app.data.noaa.wavewatch import Wavewatch


DATABASE_URL = "postgresql+psycopg2://airflow:airflow@postgres:5432/airflow"

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'start_date': datetime(2024, 1, 1),
    'email': ['your-email@example.com'],
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'wavewatch_sample_dag',
    default_args=default_args,
    description='DAG for testing Wavewatch module',
    schedule_interval=None,
    catchup=False
) as dag:

    @task
    def wavewatch_sample(num_samples=1):
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
        
        engine = create_engine(DATABASE_URL)
        Wavewatch(engine, "wave_forecast").run_sample(num_samples=num_samples)

    noaa_sample_task = wavewatch_sample(4)