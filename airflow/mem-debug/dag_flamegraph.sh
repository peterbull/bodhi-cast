#!/bin/bash

# This script is used to analyze memory usage in an Airflow DAG using the memray tool.
# It prompts the user to change the values of MEM_DAG, MEM_TASK, and MEM_SLEEP environment variables.
# It then triggers the Airflow DAG to add new URLs to the Kafka stream and waits for the stream to populate.
# After that, it runs the memray command to analyze memory usage and generates a flamegraph HTML file for visualization.
# Finally, it exports the updated values of MEM_DAG, MEM_TASK, and MEM_SLEEP to the environment.

# Usage:
# 1. Set the desired current working directory (DESIRED_CWD) in the script.
# 2. Run the script from the desired current working directory.
# 3. Follow the prompts to change the values of MEM_DAG, MEM_TASK, and MEM_SLEEP if desired.
# 4. Enter the desired output file name (without extension) when prompted.
# 5. The script will trigger the Airflow DAG, wait for the stream to populate, and analyze memory usage.
# 6. The flamegraph HTML file will be generated in the 'memray-html' directory with a timestamped file name.

# Environment Variables:
# - MEM_DAG: The Airflow DAG name to analyze memory usage for.
# - MEM_TASK: The Airflow task ID to analyze memory usage for.
# - MEM_SLEEP: The sleep duration (in seconds) to wait for the Kafka stream to populate.

# Note: The MEM_DAG, MEM_TASK, and MEM_SLEEP environment variables must be set before running this script.
# If any of these variables are not set, an error message will be displayed and the script will exit.

# Example Usage:
# $ export MEM_DAG="my_dag"
# $ export MEM_TASK="my_task"
# $ export MEM_SLEEP=60
# $ ./dag_flamegraph.sh

DESIRED_CWD="mem-debug"

echo "Current MEM_DAG: $MEM_DAG"
echo "Current MEM_TASK: $MEM_TASK"

# Prompt the user to change the values of MEM_DAG and MEM_TASK
read -p "Would you like to change the MEM_DAG and MEM_TASK values? (y/N) " change

if [ "$change" = "y" ]; then
    echo "Enter the new MEM_DAG value:"
    read MEM_DAG
    echo "Enter the new MEM_TASK value:"
    read MEM_TASK
fi

echo "new MEM_DAG: $MEM_DAG"
echo "new MEM_TASK: $MEM_TASK"
echo "Current MEM_SLEEP: $MEM_SLEEP"

read -p "Would you like to change the MEM_SLEEP values? (y/N) " change
if [ "$change" = "y" ]; then
    echo "Enter the new MEM_SLEEP value:"
    read MEM_SLEEP
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

FILE="vars.sh"

LINE1="export MEM_DAG='$MEM_DAG'"
LINE2="export MEM_TASK='$MEM_TASK'"
LINE3="export MEM_SLEEP='$MEM_SLEEP'"

add_line_if_not_exists() {
    local line="$1"
    local file="$2"
    grep -qxF "$line" "$file" || echo "$line" >> "$file"
}


add_line_if_not_exists "$LINE1" "$FILE"
add_line_if_not_exists "$LINE2" "$FILE"
add_line_if_not_exists "$LINE3" "$FILE"