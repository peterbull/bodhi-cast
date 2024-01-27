#!/bin/bash


# Create airflow directories 
mkdir -p config dags logs plugins

# Create .env file with info for permissions
echo -e "AIRFLOW_UID=$(id -u)\nAIRFLOW_GID=0" > .env

# Initialize Airflow
# Airflow init/upgrade, create user and password
# docker compose up airflow-init

# Run Docker Compose
# docker compose up