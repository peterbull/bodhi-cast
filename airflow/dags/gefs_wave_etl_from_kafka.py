import logging
import os
import re
import tempfile

import numpy as np
import pandas as pd
import pendulum
import requests
import xarray as xr
from airflow.decorators import task
from airflow.exceptions import AirflowException
from confluent_kafka import Consumer, KafkaException
from geoalchemy2 import WKTElement
from geoalchemy2.types import Geography
from geopandas import GeoSeries, points_from_xy
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

from airflow import DAG

sasl_username = os.environ.get("KAFKA_DEFAULT_USERS")
sasl_password = os.environ.get("KAFKA_DEFAULT_PASSWORDS")

DATABASE_URL = os.environ.get("AIRFLOW__DATABASE__SQL_ALCHEMY_CONN")
engine = create_engine(DATABASE_URL)

table_name = "wave_forecast"
topic = "gefs_wave_urls"

start_date = pendulum.datetime(2024, 2, 6)

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


# Will need to revisit this in the future. This is very basic fault handling,
# where a single url runs through at a time, such that if there is a failure,
# it will not be committed to the offset and a retry will resume at the correct message
def consume_from_kafka(
    topic, engine, table_name, bs=1, sasl_username=sasl_username, sasl_password=sasl_password
):
    """
    Consume messages from a Kafka topic.

    Args:
        topic (str): The name of the Kafka topic to consume from.
        bs (int, optional): The batch size of messages to consume at once. Defaults to 1.

    Returns:
        list: A list of consumed messages.

    Raises:
        KafkaException: If there is an error consuming from the Kafka topic.
    """
    conf = {
        "bootstrap.servers": "kafka:9092",
        "group.id": "airflow-consumers",
        "enable.auto.commit": False,
        "auto.offset.reset": "earliest",  # consume from the start of topic
        "security.protocol": "SASL_PLAINTEXT",
        "sasl.mechanisms": "PLAIN",
        "sasl.username": sasl_username,
        "sasl.password": sasl_password,
        "max.poll.interval.ms": 900000,
    }

    c = Consumer(conf)

    c.subscribe([topic])
    try:
        pattern = re.compile(
            r"https://nomads\.ncep\.noaa\.gov/pub/data/nccf/com/gens/prod/gefs\.(\d{8})/00/"
        )

        processed_count = 0
        while True:
            msg = c.poll(9.0)
            if msg is None:
                logging.info(f"No more messages in topic {topic}")
                break
            if msg.error():
                logging.error(f"Error consuming from topic {topic}: {msg.error()}")
                raise KafkaException(msg.error())
            else:
                message = msg.value().decode("utf-8")
                match = pattern.match(message)
                date = match.group(1)
                current_date = pendulum.now().format("YYYYMMDD")
                if date == current_date and processed_count < bs:
                    logging.info(f"Beginning processing of {message}")
                    df = url_to_df(message)
                    df_to_db(df, engine, table_name)
                    # Commit the offset after successful processing
                    c.commit()
                    logging.info(f"Consumed and processed message from {topic}")
                    processed_count += 1
                else:
                    c.commit()
                    logging.info(f"Skipping processing and updating offset for: {message}")

    finally:
        c.close()
        logging.info("Consumer closed")


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
                df["longitude"] = (
                    np.where(df["longitude"] > 180, df["longitude"] - 360, df["longitude"])
                    .astype(np.float32)
                    .round(2)
                )

                # New Transformation for points
                points = points_from_xy(df["longitude"], df["latitude"])
                df["location"] = [WKTElement(point.wkt, srid=4326) for point in points]
                df["step"] = (df["step"].dt.total_seconds() / 3600).astype(str) + " hours"
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
                chunksize=1000,
            )
            entry_id = df["valid_time"].unique()
            entry_id_datetime = pd.to_datetime(entry_id[0])
            entry_id_str = entry_id_datetime.strftime("%Y-%m-%d %H:%M:%S")
            print(f"Successfully wrote grib2 file for {entry_id}")
        except SQLAlchemyError as e:
            print(f"An error occurred: {e}")


with DAG(
    "gefs_wave_etl_from_kafka",
    default_args=default_args,
    description="Get GEFS grib2 urls from topic and batch process to postgis",
    schedule_interval="30 7 * * *",
    catchup=False,
    is_paused_upon_creation=False,
) as dag:

    def taskflow():
        conf = {
            "bootstrap.servers": "kafka:9092",
            "group.id": "airflow-consumers",
            "enable.auto.commit": False,
            "auto.offset.reset": "earliest",  # consume from the start of topic
            "security.protocol": "SASL_PLAINTEXT",
            "sasl.mechanisms": "PLAIN",
            "sasl.username": sasl_username,
            "sasl.password": sasl_password,
            "max.poll.interval.ms": 900000,
        }

        @task
        def check_for_messages():
            c = Consumer(conf)
            c.subscribe([topic])
            logging.info(f"{conf}")
            # Poll for messages
            msg = c.poll(30.0)
            c.close()

            if msg is None:
                raise AirflowException("No new messages found. Task will be retried.")
            else:
                logging.info("New messages found. Proceeding to consume and process.")
                return True

        @task
        def consume_and_process_from_kafka():
            consume_from_kafka(
                topic=topic,
                engine=engine,
                table_name=table_name,
                bs=1,
                sasl_username=sasl_username,
                sasl_password=sasl_password,
            )

        @task
        def delete_old_gefs_wave_data(table_name, days=2):
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

        @task
        def reindex_db():
            """
            Create a GiST index on the 'location' column of the table in the
            database if it doesn't already exist, then reindex the 'location'
            column.

            Raises:
                SQLAlchemyError: If an error occurs while creating or reindexing
                the index.
            """
            with engine.begin() as connection:
                try:
                    connection.execute(
                        # create indexes if they don't exist
                        text(
                            """
                        CREATE INDEX IF NOT EXISTS spots_location_idx ON spots USING gist(location);
                        CREATE INDEX IF NOT EXISTS wave_forecast_location_idx ON wave_forecast USING gist(location);
                        CREATE INDEX IF NOT EXISTS station_inventory_location_idx ON station_inventory USING gist(location);
                        """
                        )
                    )

                    print("Successfully created the index if it did not exist")
                except SQLAlchemyError as e:
                    print(f"An error occurred while creating the index: {e}")
                try:
                    connection.execute(
                        # reindex database on each new batch of data
                        text(
                            """
                    REINDEX INDEX spots_location_idx;
                    REINDEX INDEX wave_forecast_location_idx;
                    REINDEX INDEX station_inventory_location_idx;
                    """
                        )
                    )
                    print("Successfully reindexed the table")
                except SQLAlchemyError as e:
                    print(f"An error occurred while reindexing the table: {e}")

        check_result = check_for_messages()
        consume_task = consume_and_process_from_kafka()
        delete_old_data = delete_old_gefs_wave_data("wave_forecast", days=2)
        update_idxs = reindex_db()

        check_result >> consume_task >> delete_old_data >> update_idxs

    dag = taskflow()

if __name__ == "__main__":
    dag.test()
