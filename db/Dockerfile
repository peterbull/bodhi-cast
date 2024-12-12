FROM postgres:16

# Install necessary dependencies and PostGIS packages
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  ca-certificates \
  postgresql-common \
  postgresql-16-postgis-3 \
  postgresql-16-postgis-3-scripts \
  postgis \
  && rm -rf /var/lib/apt/lists/*

# Initialize PostGIS extension in template database
RUN echo "CREATE EXTENSION postgis;" > /docker-entrypoint-initdb.d/postgis.sql

# Expose PostgreSQL port
EXPOSE 5432
