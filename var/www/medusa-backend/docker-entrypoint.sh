#!/bin/sh

# Fail fast if any command exits with a non-zero status. The -e flag is
# supplied by the Dockerfile's ENTRYPOINT invocation.

# Wait for Postgres to be ready
until pg_isready -h db -p 5432 >/dev/null 2>&1; do
  echo "Waiting for Postgres..."
  sleep 1
done

# Create the database if it doesn't exist
psql postgres://postgres:postgres@db:5432/postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'medusa'" | grep -q 1 || \
  psql postgres://postgres:postgres@db:5432/postgres -c "CREATE DATABASE medusa"

# Ensure musl-compatible SWC binary is installed
yarn add @swc/core-linux-x64-musl@1.13.3 --no-lockfile

# Run migrations
npx medusa migrations run

# Execute the passed command
exec "$@"
