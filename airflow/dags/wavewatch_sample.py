from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta
from sqlalchemy import create_engine

from app.data.noaa.wavewatch import Wavewatch

DATABASE_URL = "postgresql+psycopg2://airflow:airflow@postgres:5432/airflow"

engine = create_engine(DATABASE_URL)

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

dag = DAG(
    'wavewatch_sample_dag',
    default_args=default_args,
    description='N',
    schedule_interval=timedelta(days=1),
)

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
    Wavewatch(engine, "wave_forecast").run_sample(num_samples=num_samples)

t1 = PythonOperator(
    task_id='noaa_sample_task',
    python_callable=wavewatch_sample,
    op_kwargs={'num_samples': 1},
    dag=dag,
)