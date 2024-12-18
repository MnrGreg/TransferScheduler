#!/bin/bash

# File to store PIDs
PID_FILE=".process_pids"

# Ensure PID file is empty/created
echo -n > "$PID_FILE"

# Function to cleanup processes
cleanup() {
    echo "Cleaning up processes..."
    if [ -f "$PID_FILE" ]; then
        while read -r pid; do
            if [ ! -z "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                echo "Killing process $pid"
                kill "$pid"
                wait "$pid" 2>/dev/null
            fi
        done < "$PID_FILE"
        rm "$PID_FILE"
    fi
    exit 0
}

# Set up trap to catch termination signals
trap cleanup SIGINT SIGTERM EXIT

# Run the command passed as arguments
"$@" &
echo $! >> "$PID_FILE"

# Wait for the process
wait
