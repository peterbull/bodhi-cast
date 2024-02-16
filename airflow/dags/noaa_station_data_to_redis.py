import json
import logging
import os

import pendulum
import redis
from airflow.decorators import task
from confluent_kafka import Consumer, KafkaException

from airflow import DAG

sasl_username = os.environ.get("KAFKA_DEFAULT_USERS")
sasl_password = os.environ.get("KAFKA_DEFAULT_PASSWORDS")
redis_password = os.getenv("REDIS_PASSWORD")
redis_client = redis.Redis(host="redis", port=6379, db=0, password=redis_password)

start_date = pendulum.datetime(2024, 1, 1)

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "start_date": start_date,
    "email": ["your-email@example.com"],
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 5,
    "retry_delay": pendulum.duration(minutes=1),
}


with DAG(
    "noaa_station_data_to_redis",
    default_args=default_args,
    description="Write latest noaa station data to redis",
    schedule="*/6 * * * *",
    catchup=False,
) as dag:

    topic = "noaa_station_latest_data"

    def taskflow():

        @task
        def consume_from_kafka(topic, sasl_username=sasl_username, sasl_password=sasl_password):
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
                while True:
                    msg = c.poll(9.0)
                    if msg is None:
                        logging.info(f"No more messages in topic {topic}")
                        break
                    if msg.error():
                        logging.error(f"Error consuming from topic {topic}: {msg.error()}")
                        raise KafkaException(msg.error())

                    message_value = json.loads(msg.value().decode("utf-8"))
                    location_id = message_value["id"]
                    water_height = message_value["v"]
                    measurement_time = message_value["time"]

                    redis_value = json.dumps(
                        {"water_height": water_height, "time": measurement_time}
                    )
                    redis_client.set(location_id, redis_value)
                    redis_client.expire(location_id, 600)
                    c.commit()
                    logging.info(
                        f"Updated location {location_id} with water height {water_height} and time {measurement_time} in Redis."
                    )

            finally:
                c.close()

        data = consume_from_kafka(topic=topic)

    dag = taskflow()
