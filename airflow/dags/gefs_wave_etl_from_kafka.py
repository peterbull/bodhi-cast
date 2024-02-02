import logging
import os
import tempfile

import pandas as pd
import pendulum
import requests
import xarray as xr
from airflow.decorators import task
from confluent_kafka import Consumer, KafkaException
from geoalchemy2 import WKTElement
from geoalchemy2.types import Geography
from shapely.geometry import Point
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError

from airflow import DAG

DATABASE_URL = os.environ.get("AIRFLOW__DATABASE__SQL_ALCHEMY_CONN")
engine = create_engine(DATABASE_URL)

table_name = "wave_forecast"
topic = "gefs_wave_urls"

start_date = pendulum.datetime(2024, 1, 1)

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
def consume_from_kafka(topic, bs=1):
    conf = {
        "bootstrap.servers": "kafka:9092",
        "group.id": "airflow-consumers",
        "auto.offset.reset": "earliest",  # consume from the start of topic
    }

    c = Consumer(conf)

    c.subscribe([topic])

    messages = []

    try:
        for _ in range(bs):
            msg = c.poll(6.0)
            if msg is None:
                logging.info(f"No more messages in topic {topic}")
                break
            if msg.error():
                logging.error(f"Error consuming from topic {topic}: {msg.error()}")
                raise KafkaException(msg.error())
            else:
                messages.append(msg.value().decode("utf-8"))
                logging.info(f"Consumed message from {topic}")
    finally:
        c.close()
        logging.info("Consumer closed")
        logging.info(f"{messages}")
    return messages


def url_to_df(url):
    """
    Fetches data from the specified URL and returns it as a pandas
    DataFrame. Xarray is used as an intermediary to utilize decoding with `cfgrib`.
    Rows with no meteorological data are dropped to decrease extra load.

    Args:
        target (str): The target URL to fetch the data from.

    Returns:
        pandas.DataFrame: The fetched data as a pandas DataFrame, with NaN
        swell values dropped and index reset.
    """
    response = requests.get(f"{url}")
    if response.status_code == 200:
        with tempfile.NamedTemporaryFile() as tmp:
            tmp.write(response.content)
            tmp.flush()

            with xr.open_dataset(tmp.name, engine="cfgrib") as ds:
                data = ds.load()
                df = data.to_dataframe()
                df.reset_index(level=["latitude", "longitude"], inplace=True)
                df.drop(columns="surface", inplace=True)
                df.dropna(
                    subset=[
                        "swh",
                        "perpw",
                        "dirpw",
                        "shww",
                        "mpww",
                        "wvdir",
                        "ws",
                        "wdir",
                        "swper",
                        "swell",
                    ],
                    how="all",
                    inplace=True,
                )
                # Adjust longitude scaling to domain of -180 to 180
                df["longitude"] = (
                    df["longitude"].apply(lambda x: x - 360 if x > 180 else x).round(2)
                )
                # Create a point for postgis for indexing
                df["location"] = df.apply(
                    lambda row: Point(row["longitude"], row["latitude"]), axis=1
                )
                # Give a mercator value for the point where `srid` defines the projection scheme
                df["location"] = df["location"].apply(lambda loc: WKTElement(loc.wkt, srid=4326))
                df["step"] = df["step"].dt.total_seconds() / 3600.0
                df["step"] = df["step"].astype(str) + " hours"
                return df

    else:
        print(f"Failed to get data: {response.status_code}")


def df_to_db(df, engine, table_name):
    """
    Commit a DataFrame to the database.

    Args:
        df (pandas.DataFrame): The DataFrame to be committed.

    Raises:
        SQLAlchemyError: If an error occurs while committing the DataFrame
        to the database.
    """
    with engine.begin() as connection:
        try:
            df["entry_updated"] = pendulum.now("UTC")
            df.to_sql(
                table_name,
                con=connection,
                if_exists="append",
                index=False,
                dtype={"location": Geography(geometry_type="POINT", srid=4326)},
            )
            entry_id = df["valid_time"].unique()
            entry_id = entry_id[0].strftime("%Y-%m-%d %H:%M:%S")
            print(f"Successfully wrote grib2 file for {entry_id}")
        except SQLAlchemyError as e:
            print(f"An error occurred: {e}")


def process_url(url, engine, table_name):
    logging.info(f"Processing URL: {url}")
    df = url_to_df(url)
    df_to_db(df, engine, table_name)


# needed to add this because urls is returned as XComArg
@task
def process_urls(urls, engine, table_name):
    for url in urls:
        process_url(url, engine, table_name)


# revisit to refactor based on https://airflow.apache.org/docs/apache-airflow/2.8.1/best-practices.html#top-level-python-code
with DAG(
    "gefs_wave_etl_from_kafka",
    default_args=default_args,
    description="Get GEFS grib2 urls from topic and batch process to postgis",
    schedule=None,
    catchup=False,
) as dag:
    urls = consume_from_kafka(topic=topic)
    process_urls(urls, engine=engine, table_name=table_name)

if __name__ == "__main__":
    dag.test()
