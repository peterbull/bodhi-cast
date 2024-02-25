import asyncio
import json
import logging
import os
import urllib.parse

import aiohttp
import pendulum
from airflow.decorators import task
from app.models.models import StationInventory
from confluent_kafka import KafkaException, Producer
from confluent_kafka.admin import AdminClient, ConfigResource, NewTopic
from noaa_coops import Station, get_stations_from_bbox
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from tqdm import tqdm

from airflow import DAG

sasl_username = os.environ.get("KAFKA_DEFAULT_USERS")
sasl_password = os.environ.get("KAFKA_DEFAULT_PASSWORDS")


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


with DAG(
    "noaa_station_data_to_kafka",
    default_args=default_args,
    description="Get current tide data from noaa coops stations and write to kafka topic",
    schedule="*/6 * * * *",
    # schedule=None, # debug setting
    catchup=False,
    is_paused_upon_creation=False,
) as dag:

    def taskflow():
        products = [
            "air_temperature",
            "water_temperature",
            "wind",
            "air_pressure",
            "visibility",
            "conductivity",
            "humidity",
            "salinity",
            "water_level",
            "air_gap",
            "currents",
        ]
        datum = "MLLW"
        time_zone = "gmt"
        units = "metric"

        topic = "noaa_station_latest_data"
        config_changes = {"retention.ms": "1600000"}

        @task
        def get_station_urls():
            db = Session()
            try:
                station_ids = (
                    db.query(StationInventory.station_id)
                    .filter(StationInventory.has_water_level == True)
                    .all()
                )
                urls = [
                    f"https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station={station_id._data[0]}&product={product}&datum={datum}&time_zone={time_zone}&units={units}&format=json"
                    for product in products
                    for station_id in station_ids
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
                    data = await response.json()
                    # parsing to extract queries
                    parsed_url = urllib.parse.urlparse(url)
                    query_params = urllib.parse.parse_qs(parsed_url.query)
                    product = query_params.get("product", [None])[0]

                    # Add product
                    if "metadata" in data:  # this assumes all requests have metadata key
                        data["metadata"]["product"] = product
                    return data

            async def fetch_all(urls):
                async with aiohttp.ClientSession() as session:
                    results = await asyncio.gather(
                        *[fetch(session, url) for url in urls], return_exceptions=True
                    )
                    return results

            return asyncio.run(fetch_all(urls))

        @task
        def process_data(data):
            combined_data = {}
            for item in data:
                # add a current time field to each time for sorting
                if "metadata" in item and "id" in item["metadata"]:
                    station_id = item["metadata"]["id"]
                    product = item["metadata"]["product"]
                    current_time = pendulum.now("UTC")

                    # check if station_id has already been added
                    if station_id not in combined_data:
                        combined_data[station_id] = {
                            "metadata": {
                                k: v for k, v in item["metadata"].items() if k != "product"
                            },  # copy metadata without product
                            "data": {},
                            "entry_created": current_time.isoformat(),
                        }
                    combined_data[station_id]["data"][product] = item["data"]

            # convert back to list
            combined_data_list = [
                {"metadata": v["metadata"], "data": v["data"], "entry_created": v["entry_created"]}
                for k, v in combined_data.items()
            ]

            sorted_combined_data_list = sorted(combined_data_list, key=lambda x: x["entry_created"])

            return sorted_combined_data_list

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
                logging.info("Messages written to kafka")
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
