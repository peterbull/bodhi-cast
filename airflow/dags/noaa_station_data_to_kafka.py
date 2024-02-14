import asyncio
import json
import logging
import os

import aiohttp
import pendulum
import requests
from airflow.decorators import task
from app.models.models import StationInventory
from confluent_kafka import KafkaException, Producer
from confluent_kafka.admin import AdminClient, ConfigResource, NewTopic
from noaa_coops import Station, get_stations_from_bbox
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from airflow import DAG

sasl_username = os.environ.get("KAFKA_DEFAULT_USERS")
sasl_password = os.environ.get("KAFKA_DEFAULT_PASSWORDS")

topic = "noaa_station_latest_data"
config_changes = {"retention.ms": "600000"}


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


async def fetch(session, url):
    async with session.get(url) as response:
        return await response.json()


async def fetch_all(urls):
    async with aiohttp.ClientSession() as session:
        results = await asyncio.gather(
            *[fetch(session, url) for url in urls], return_exceptions=True
        )
        return results


def synchronous_fetch_all(urls):
    # Directly using asyncio.run for Python 3.7+
    return asyncio.run(fetch_all(urls))


with DAG(
    "noaa_station_data_to_kafka",
    default_args=default_args,
    description="Get current tide data from noaa coops stations and write to kafka topic",
    schedule=None,
    catchup=False,
) as dag:

    def taskflow():

        @task
        def get_station_urls():
            db = Session()
            product = "water_level"
            datum = "MLLW"
            time_zone = "gmt"
            urls = []
            try:
                station_ids = (
                    db.query(StationInventory.station_id)
                    .filter(StationInventory.has_water_level == True)
                    .all()
                )
                urls = [
                    f"https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station={station_id}&product={product}&datum={datum}&time_zone={time_zone}&units=metric&format=json"
                    for station_id, in station_ids
                ]
            except Exception as e:
                logging.error(f"Error generating urls: {e}")
            finally:
                db.close()
            return urls

        @task
        def synchronous_fetch_all(urls):
            async def fetch(session, url):
                async with session.get(url) as response:
                    return await response.json()

            async def fetch_all(urls):
                async with aiohttp.ClientSession() as session:
                    results = await asyncio.gather(
                        *[fetch(session, url) for url in urls], return_exceptions=True
                    )
                    return results

            return asyncio.run(fetch_all(urls))

        @task
        def process_data(data):
            kafka_messages = [
                {"id": item["metadata"]["id"], "time": entry["t"], "v": entry["v"]}
                for item in data
                for entry in item.get("data", [])
            ]
            for message in kafka_messages:
                logging.info(f"Processed: {message}")

            return kafka_messages

        @task
        def write_to_kafka(data):
            conf = {
                "bootstrap.servers": "kafka:9092",
                "security.protocol": "SASL_PLAINTEXT",
                "sasl.mechanisms": "PLAIN",
                "sasl.username": sasl_username,
                "sasl.password": sasl_password,
            }

            producer = Producer(conf)

            for item in data:
                try:
                    message = json.dumps(item).encode("utf-8")
                    producer.produce(topic, message)
                except Exception as e:
                    logging.error(f"Failed to send message to Kafka: {e}")

            try:
                producer.flush()
            except Exception as e:
                logging.error(f"Failed to flush messages to Kafka: {e}")

            # Change default retention time for the topic
            admin_client = AdminClient(conf)
            config_resource = ConfigResource(ConfigResource.Type.TOPIC, topic, config_changes)
            fs = admin_client.alter_configs([config_resource])
            for res, f in fs.items():
                try:
                    f.result()
                    logging.info(f"Configuration for {res} changed successfully")
                except Exception as e:
                    logging.info(f"Failed to change configuration for {res}: {e}")

        urls = get_station_urls()
        data = synchronous_fetch_all(urls)
        processed_data = process_data(data)
        kafka_messages = write_to_kafka(processed_data)

    dag = taskflow()
