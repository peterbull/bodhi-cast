import logging
import os

import pendulum
from airflow.decorators import task
from sqlalchemy import create_engine, text

from airflow import DAG

DATABASE_URL = os.environ.get("AIRFLOW__DATABASE__SQL_ALCHEMY_CONN")
engine = create_engine(DATABASE_URL)
table_name = "wave_forecast"
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


@task
def delete_old_gefs_wave_data(engine, table_name, days=2):
    cutoff_date = pendulum.now("UTC").subtract(days)
    cutoff_date_str = cutoff_date.strftime("%Y-%m-%d %H:%M:%S")

    with engine.begin() as connection:
        query = text(
            f"""
                     DELETE FROM {table_name} WHERE entry_updated < :cutoff_date_str
                     """
        )
        result = connection.execute(query, {"cutoff_date_str": cutoff_date_str})
        logging.info(f"Deleted {result.rowcount} rows from {table_name}")


with DAG(
    "delete_old_gefs_wave_data",
    "Deletes old GEFS wave data that is older than a specified cutoff date",
    default_args=default_args,
    schedule="0 6 * * *",
    catchup=False,
    is_paused_upon_creation=True,
) as dag:
    data = delete_old_gefs_wave_data(engine=engine, table_name=table_name, days=2)

if __name__ == "__main__":
    dag.test()
