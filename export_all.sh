#!/bin/bash

# Directories to scan
directories_to_scan=("$@")

# Read ignore list from a file
ignore_file="./export_exclude.txt"
ignore_list=($(cat "$ignore_file"))

# Function to check if a file or directory should be ignored
should_ignore() {
    local file_path=$(realpath "$1") # Get absolute path of the file
    for item in "${ignore_list[@]}"; do
        local abs_ignore=$(realpath "$item") # Convert ignore item to absolute path
        if [[ "$file_path" == "$abs_ignore" ]] || [[ "$file_path" == "$abs_ignore/"* ]]; then
            return 0 # True, should be ignored
        fi
    done
    return 1 # False, should not be ignored
}

# Function to process directories
process_directories() {
    local output_file="./export/text.txt" # Define output file
    for dir in "${directories_to_scan[@]}"; do
        # Recursively iterate over files in directory
        find "$dir" -type f | while read -r file; do
            local abs_file=$(realpath "$file") # Get absolute path of current file
            local abs_output=$(realpath "$output_file") # Get absolute path of output file
            if ! should_ignore "$abs_file" && [ "$abs_file" != "$abs_output" ]; then
                echo "### File: $file"
                echo "   "
                echo "###"
                cat "$file"
                echo "###"
                echo "   "
            fi
        done
    done
}

# Main execution
process_directories
