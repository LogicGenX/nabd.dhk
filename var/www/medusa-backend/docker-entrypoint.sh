#!/bin/sh
set -e

# Wait for Postgres to be ready
until pg_isready -h db -p 5432 >/dev/null 2>&1; do
  echo "Waiting for Postgres..."
  sleep 1
done

# Create the database if it doesn't exist
psql postgres://postgres:postgres@db:5432/postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'medusa'" | grep -q 1 || \
  psql postgres://postgres:postgres@db:5432/postgres -c "CREATE DATABASE medusa"

# Run migrations
npx medusa migrations run

# Execute the passed command
exec "$@"
