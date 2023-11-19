# Use an official Python runtime as a parent image
FROM python:3.10.12-slim

# Install Poetry
ENV POETRY_VERSION=1.7.0
RUN pip install "poetry==$POETRY_VERSION"

# Install system dependencies required for psycopg2
RUN apt-get update && apt-get install -y libpq-dev gcc && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy Poetry configuration files
COPY pyproject.toml poetry.lock ./

# Install dependencies
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi

# Copy the rest of your application's code
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

