# Use an official Python runtime as a parent image
FROM python:3.10.12-slim AS server

# Set the working directory in the container
WORKDIR /usr/src/app

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential cmake wget && \
    rm -rf /var/lib/apt/lists/*