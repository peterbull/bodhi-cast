import logging
import os

import pendulum
from airflow.decorators import task
from confluent_kafka import Consumer, KafkaException

from airflow import DAG

sasl_username = os.environ.get("KAFKA_DEFAULT_USERS")
sasl_password = os.environ.get("KAFKA_DEFAULT_PASSWORDS")


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


with DAG(
    "monitor_kafka_topics",
    default_args=default_args,
    description="Monitor the content of Kafka topics",
    schedule=None,
    catchup=False,
) as dag:

    def taskflow():

        @task
        def monitor_kafka_topic(topic, sasl_username=sasl_username, sasl_password=sasl_password):
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

            total_msgs = 0
            while True:
                msg = c.poll(9.0)
                if msg is None:
                    logging.info(f"No more messages in topic {topic}")
                    break
                if msg.error():
                    logging.error(f"Error consuming from topic {topic}: {msg.error()}")
                    raise KafkaException(msg.error())
                logging.info("Received message: {}".format(msg.value().decode("utf-8")))
                total_msgs += 1
            # Skipping committing the offsets so that this can be run as many times as needed
            c.close()
            logging.info(f"Total messages: {total_msgs}")

        monitor_wave_urls = monitor_kafka_topic(
            topic="gefs_wave_urls", sasl_username=sasl_username, sasl_password=sasl_password
        )

        monitor_station_data = monitor_kafka_topic(
            topic="noaa_station_latest_data",
            sasl_username=sasl_username,
            sasl_password=sasl_password,
        )

    dag = taskflow()

    if __name__ == "__main__":
        dag.test()
