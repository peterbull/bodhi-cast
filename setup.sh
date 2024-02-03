#!/bin/bash

# Get the new UID and GID
new_uid=$(id -u)
new_gid=0

# Check if AIRFLOW_UID exists in the .env file
if grep -q "AIRFLOW_UID" .env; then
    # If it exists, update it
    sed -i "s/^AIRFLOW_UID=.*/AIRFLOW_UID=$new_uid/" .env
else
    # If it doesn't exist, append it
    echo "AIRFLOW_UID=$new_uid" >> .env
fi

# Check if AIRFLOW_GID exists in the .env file
if grep -q "AIRFLOW_GID" .env; then
    # If it exists, update it
    sed -i "s/^AIRFLOW_GID=.*/AIRFLOW_GID=$new_gid/" .env
else
    # If it doesn't exist, append it
    echo "AIRFLOW_GID=$new_gid" >> .env
fi