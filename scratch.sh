#!/bin/bash

docker exec bodhi-cast-airflow-worker-1 airflow dags trigger gefs_wave_urls_to_kafka && \
docker exec bodhi-cast-airflow-worker-1 airflow dags trigger gefs_wave_etl_from_kafka

docker exec -it bodhi-cast-postgres-1 psql -U your_postgres_user -d your_database -c "SELECT COUNT(*) FROM wave_forecast;"

