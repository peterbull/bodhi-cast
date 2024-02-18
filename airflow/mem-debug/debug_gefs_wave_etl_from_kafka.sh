#!/bin/bash

DESIRED_CWD="mem-debug"


CURRENT_DIR=$(basename "$(pwd)")

# Check if the current working directory is the desired one
if [ "$CURRENT_DIR" != "$DESIRED_CWD" ]; then
    echo "Error: This script must be run from the '$DESIRED_CWD' directory."
    exit 1
fi

OUTPUT_DIR="./memray-bin"
timestamp=$(date +%Y%d%H%M%S)

mkdir -p "$OUTPUT_DIR"
echo "Please enter the desired output file name (without extension):"
read output_file_name

output_file_name="${timestamp}_${output_file_name}"

airflow dags trigger gefs_wave_urls_to_kafka # add new urls to kafka stream
sleep 30 # wait for stream to populate

memray run -o "./$OUTPUT_DIR/${output_file_name}.bin" -m airflow tasks test monitor_kafka_topics monitor_kafka_topic

OUTPUT_DIR="./memray-html"
mkdir -p "$OUTPUT_DIR"

/usr/local/bin/python -m memray flamegraph "./$OUTPUT_DIR/${output_file_name}.bin"
