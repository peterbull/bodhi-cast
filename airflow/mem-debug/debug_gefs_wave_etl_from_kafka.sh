#!/bin/bash
# Setup for running memray on airflow dags to test memory usage and leaks

# This script is used to set up and run memray on Airflow DAGs in order to test memory usage and leaks. 
# It prompts the user to change the values of the MEM_DAG and MEM_TASK environment variables, and then runs the memray command to analyze memory usage.
# The output is saved in a binary file and a flamegraph HTML file is generated for visualization.

DESIRED_CWD="mem-debug"

echo "Current MEM_DAG: $MEM_DAG"
echo "Current MEM_TASK: $MEM_TASK"

# Prompt the user to change the values of MEM_DAG and MEM_TASK
read -p "Would you like to change the MEM_DAG and MEM_TASK values? (y/N) " change

if [ "$change" = "y" ]; then
    echo "Enter the new MEM_DAG value:"
    read MEM_DAG
    export MEM_DAG
    echo "Enter the new MEM_TASK value:"
    read MEM_TASK
    export MEM_TASK
fi

echo "new MEM_DAG: $MEM_DAG"
echo "new MEM_TASK: $MEM_TASK"
echo "Current MEM_SLEEP: $MEM_SLEEP"

read -p "Would you like to change the MEM_SLEEP values? (y/N) " change
if [ "$change" = "y" ]; then
    echo "Enter the new MEM_SLEEP value:"
    read MEM_SLEEP
    export MEM_SLEEP
fi

echo "new MEM_SLEEP: $MEM_SLEEP"

# Check if MEM_DAG and MEM_TASK are set
if [ -z "$MEM_DAG" ] || [ -z "$MEM_TASK" ] || [ -z "$MEM_SLEEP" ]; then
    echo "Error: The MEM_DAG, MEM_TASK, MEM_SLEEP environment variables must be set."
    exit 1
fi

CURRENT_DIR=$(basename "$(pwd)")

# Check if the current working directory is the desired one
if [ "$CURRENT_DIR" != "$DESIRED_CWD" ]; then
    echo "Error: This script must be run from the '$DESIRED_CWD' directory."
    exit 1
fi

OUTPUT_DIR="memray-bin"
timestamp=$(date +%Y%d%H%M%S)

mkdir -p "$OUTPUT_DIR"
echo "Please enter the desired output file name (without extension):"
read output_file_name

if [ -z "$output_file_name" ]; then
    output_file_name="anonymous"
fi

output_file_name="${timestamp}_${output_file_name}"

# Trigger the Airflow DAG to add new URLs to the Kafka stream
airflow dags trigger gefs_wave_urls_to_kafka

# Wait for the stream to populate
sleep $MEM_SLEEP

# Run memray command to analyze memory usage
memray run -o "$OUTPUT_DIR/${output_file_name}.bin" -m airflow tasks test $MEM_DAG $MEM_TASK 

HTML_DIR="./memray-html"
mkdir -p "$HTML_DIR"

# Generate flamegraph HTML file for visualization
/usr/local/bin/python -m memray flamegraph "$OUTPUT_DIR/${output_file_name}.bin"
mv "$OUTPUT_DIR/memray-flamegraph-${output_file_name}.html" "./memray-html/${output_file_name}-memray-flamegraph.html"
