#!/bin/sh

# Fail fast if any command exits with a non-zero status. The -e flag is
# supplied by the Dockerfile's ENTRYPOINT invocation.

# Wait for Postgres to be ready
PG_MAX_ATTEMPTS=${PG_MAX_ATTEMPTS:-60}
PG_WAIT_ATTEMPTS=0

if [ -n "$DATABASE_URL" ]; then
  PG_WAIT_DSN="$DATABASE_URL"
  PG_WAIT_LABEL='DATABASE_URL'
else
  PG_WAIT_DSN="postgres://postgres:postgres@db:5432/postgres"
  PG_WAIT_LABEL='db:5432'
fi

PG_WAIT_TARGET=${PG_WAIT_DSN#*://}
PG_WAIT_TARGET=${PG_WAIT_TARGET##*@}
PG_WAIT_TARGET=${PG_WAIT_TARGET%%[:/?]*}
[ -n "$PG_WAIT_TARGET" ] && PG_WAIT_LABEL="$PG_WAIT_TARGET"

echo "Waiting for Postgres at $PG_WAIT_LABEL (max $PG_MAX_ATTEMPTS attempts)..."
while ! pg_isready -d "$PG_WAIT_DSN" >/dev/null 2>&1; do
  PG_WAIT_ATTEMPTS=$((PG_WAIT_ATTEMPTS + 1))
  if [ "$PG_WAIT_ATTEMPTS" -ge "$PG_MAX_ATTEMPTS" ]; then
    echo "Postgres not ready after $PG_WAIT_ATTEMPTS attempts, continuing with startup."
    break
  fi
  echo "Waiting for Postgres... attempt $PG_WAIT_ATTEMPTS/$PG_MAX_ATTEMPTS"
  sleep 1
done
if [ "$PG_WAIT_ATTEMPTS" -lt "$PG_MAX_ATTEMPTS" ]; then
  echo "Postgres is ready."
fi

# Create the database if it doesn't exist (local Compose only)
if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL provided; skipping Compose-specific database bootstrap."
else
  psql postgres://postgres:postgres@db:5432/postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'medusa'" | grep -q 1 || \
    psql postgres://postgres:postgres@db:5432/postgres -c "CREATE DATABASE medusa"
fi

# Ensure .env exists (from template) for secrets/JWT
if [ -z "$RENDER" ]; then
  if [ ! -f .env ] && [ -f template.env ]; then
    echo "Local dev: creating .env from template.env"
    cp template.env .env
  fi
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
