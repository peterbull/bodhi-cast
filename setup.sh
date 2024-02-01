#!/bin/bash

# Create .env file with info for permissions
echo -e "AIRFLOW_UID=$(id -u)\nAIRFLOW_GID=0" > .env
