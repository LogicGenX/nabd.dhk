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

# Ensure .env exists (from template) for secrets/JWT
if [ ! -f .env ] && [ -f template.env ]; then
  echo "No .env found. Copying from template.env"
  cp template.env .env
fi

# Run migrations
if command -v medusa >/dev/null 2>&1; then
  medusa migrations run
else
  npx medusa migrations run
fi

# Ensure an admin user exists via Node script (reliable)
echo "Ensuring admin user via Node script..."
if ! node ./scripts/ensure-admin.js; then
  echo "Node ensure-admin failed; falling back to Medusa CLI"
  ADMIN_EMAIL=${MEDUSA_ADMIN_EMAIL:-admin@nabd.dhk}
  ADMIN_PASSWORD=${MEDUSA_ADMIN_PASSWORD:-supersecret12345678}
  ADMIN_FIRST=${MEDUSA_ADMIN_FIRST:-Admin}
  ADMIN_LAST=${MEDUSA_ADMIN_LAST:-User}
  if command -v medusa >/dev/null 2>&1; then
    medusa user -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD" -f "$ADMIN_FIRST" -l "$ADMIN_LAST" || true
  else
    npx medusa user -e "$ADMIN_EMAIL" -p "$ADMIN_PASSWORD" -f "$ADMIN_FIRST" -l "$ADMIN_LAST" || true
  fi
fi

# Execute the passed command
exec "$@"
