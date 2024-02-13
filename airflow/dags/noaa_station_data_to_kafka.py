import asyncio
import logging
import os

import aiohttp
import pendulum
import requests
from airflow.decorators import task
from app.models.models import StationInventory
from noaa_coops import Station, get_stations_from_bbox
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from airflow import DAG

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
                logging.info(message)

        urls = get_station_urls()
        data = synchronous_fetch_all(urls)
        processed_data = process_data(data)

    dag = taskflow()
