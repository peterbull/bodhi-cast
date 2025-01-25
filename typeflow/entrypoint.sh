#!/bin/sh
set -e

echo "Starting entrypoint script..."

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  exit 1
fi

# Run migrations using DATABASE_URL from environment
echo "Running database migrations..."
pnpm drizzle-kit migrate
echo "Migrations completed!"

# echo "Starting Tail"
# sleep infinity

# Run command passed to docker image on start
exec "$@"
