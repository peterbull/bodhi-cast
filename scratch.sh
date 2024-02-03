#!/bin/bash
# Load environment variables from .env file
set -a # automatically export all variables
source .env
set +a # stop automatically exporting variables

docker exec bodhi-cast-airflow-worker-1 airflow dags trigger gefs_wave_urls_to_kafka && \
docker exec bodhi-cast-airflow-worker-1 airflow dags trigger gefs_wave_etl_from_kafka

sleep 150

docker exec bodhi-cast-postgres-1 psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} -c "SELECT COUNT(*) FROM wave_forecast;"
