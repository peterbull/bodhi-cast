import logging
import os
import re
import tempfile

import pandas as pd
import pendulum
import requests
import xarray as xr
from airflow.decorators import task
from airflow.sensors.external_task import ExternalTaskSensor
from confluent_kafka import Consumer, KafkaException
from geoalchemy2 import WKTElement
from geoalchemy2.types import Geography
from shapely.geometry import Point
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError

from airflow import DAG

sasl_username = os.environ.get("KAFKA_DEFAULT_USERS")
sasl_password = os.environ.get("KAFKA_DEFAULT_PASSWORDS")

DATABASE_URL = os.environ.get("AIRFLOW__DATABASE__SQL_ALCHEMY_CONN")
engine = create_engine(DATABASE_URL)

table_name = "wave_forecast"
topic = "gefs_wave_urls"

start_date = pendulum.datetime(2025, 1, 1)

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


with DAG(
    "debug_wave_etl_kafka_consumption",
    default_args=default_args,
    description="Debug Versionn of Get GEFS grib2 urls from topic and batch process to postgis",
    schedule_interval=None,
    # schedule_interval="46 13 * * *",
    catchup=False,
) as dag:

    # ExternalTaskSensor to wait for gefs_wave_urls_to_kafka DAG to complete
    wait_for_gefs_wave_urls_to_kafka = ExternalTaskSensor(
        task_id="wait_for_gefs_wave_urls_to_kafka",
        external_dag_id="gefs_wave_urls_to_kafka",
        external_task_id=None,  # `None` will wait for the entire task to complete
        timeout=7200,  # Timeout before failing task
        poke_interval=60,  # Seconds to wait between checks
        mode="reschedule",  # Reschedule for long waits to free up worker slots
    )

    @task
    def consume_and_process_from_kafka():
        consume_from_kafka(
            topic=topic,
            engine=engine,
            table_name=table_name,
            bs=8,
            sasl_username=sasl_username,
            sasl_password=sasl_password,
        )

    data = consume_and_process_from_kafka()

    wait_for_gefs_wave_urls_to_kafka >> data

if __name__ == "__main__":
    dag.test()
