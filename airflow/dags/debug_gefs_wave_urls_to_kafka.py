import logging
import os
import re
from urllib.parse import urljoin

import pendulum
import requests
from airflow.decorators import task
from bs4 import BeautifulSoup
from confluent_kafka import Producer
from confluent_kafka.admin import AdminClient, ConfigResource

from airflow import DAG

sasl_username = os.environ.get("KAFKA_DEFAULT_USERS")
sasl_password = os.environ.get("KAFKA_DEFAULT_PASSWORDS")

start_date = pendulum.datetime(2026, 1, 1)

topic = "gefs_wave_urls"

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
def get_gefs_wave_urls(epoch, date):
    """
    Retrieves the URLs of mean ensemble wave models for a given epoch and date.

    Args:
        epoch (str): The epoch(hour) of the wave models.
        date (str): The date of the wave models.

    Returns:
        list: A list of URLs of mean ensemble wave models.
    """
    url = f"https://nomads.ncep.noaa.gov/pub/data/nccf/com/gens/prod/gefs.{date}/{epoch}/wave/gridded/"
    # Pattern for mean ensemble wave models at epoch:
    pattern = re.compile(r".*\.mean\.global\.0p25\.f\d{3}\.grib2")
    response = requests.get(url)
    soup = BeautifulSoup(response.content, "html.parser")
    urls = [urljoin(url, a.get("href")) for a in soup.find_all("a", href=pattern)]

    return urls


@task
def send_urls_to_kafka(urls, topic, sasl_username=sasl_username, sasl_password=sasl_password):
    conf = {
        "bootstrap.servers": "kafka:9092",
        "security.protocol": "SASL_PLAINTEXT",
        "sasl.mechanisms": "PLAIN",
        "sasl.username": sasl_username,
        "sasl.password": sasl_password,
    }

    producer = Producer(conf)

    delivery_reports = []

    """Create and check delivery report
    Airflow will otherwise always return `success` at the end of the producer flush, 
    even if it fails to write"""

    def delivery_report(err, msg):
        if err is not None:
            delivery_reports.append((False, f"Message delivery failed: {err}"))
            logging.error(f"Message delivery failed: {err}")
        else:
            delivery_reports.append(
                (True, f"Message delivered to {msg.topic()} [{msg.partition()}]")
            )
            logging.info(f"Message delivered to {msg.topic()} [{msg.partition()}]")

    for url in urls:
        try:
            producer.produce(topic, url, callback=delivery_report)
        except Exception as e:
            logging.error(f"Failed to send message to Kafka: {e}")

    try:
        producer.flush()
    except Exception as e:
        logging.error(f"Failed to flush messages to Kafka: {e}")

    for success, report in delivery_reports:
        if not success:
            logging.error(report)

    if all(success for success, report in delivery_reports):
        logging.info("All messages were successfully delivered to Kafka.")
    else:
        logging.error("Some messages failed to be delivered to Kafka.")


# revisit to refactor based on https://airflow.apache.org/docs/apache-airflow/2.8.1/best-practices.html#top-level-python-code
with DAG(
    "debug_gefs_wave_urls_to_kafka",
    default_args=default_args,
    description="Get GEFS wave forecast grib2 file urls",
    schedule_interval=None,
    catchup=False,
) as dag:
    # Available forecasts
    forecast_intervals = ["00", "06", "12", "18"]
    # Fetch just the first model of the day due to storage size on disk
    epoch = forecast_intervals[0]
    date = pendulum.now("UTC").strftime("%Y%m%d")  # Current Time UTC
    gefs_wave_urls = get_gefs_wave_urls(epoch, date)
    send_to_kafka = send_urls_to_kafka(
        gefs_wave_urls, topic=topic, sasl_username=sasl_username, sasl_password=sasl_password
    )

if __name__ == "__main__":
    dag.test()
