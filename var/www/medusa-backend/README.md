# Medusa Backend (nabd.dhk)

Medusa powers the nabd.dhk commerce API, Admin Lite services and background jobs. The project ships with a Docker-based local stack, Render deployment hooks for preview environments and scripts that keep admin accounts and migrations in sync across environments.

## Key features

- **Admin Lite API** mounted under `src/api/admin/lite` and consumed by the Next.js proxy for `/admin/lite`.
- **First-party Admin UI** via `@medusajs/admin` served at `/app` (the legacy `/admin` route only exposes the API).
- **Docker Compose** stack that bundles Postgres 15, Redis 7 and an Nginx proxy for development parity with production.
- **Automation scripts** (`scripts/migrate-and-start.js` and `scripts/ensure-admin.js`) that apply migrations and seed the default admin user every time the service boots.

## Requirements

- Node.js 20+
- Docker & Docker Compose (recommended for local development)
- Access to the environment secrets referenced in `template.env`

## Getting started locally

1. Copy the example environment file and adjust secrets:
   ```bash
   cd var/www/medusa-backend
   cp template.env .env
   ```
2. Launch the stack:
   ```bash
   docker compose up --build
   ```
   - Medusa is available on `http://localhost:7001` and proxied to `http://localhost` through the bundled Nginx container.
   - Postgres data is persisted via the `postgres-data` volume, so restarts keep your database state.
   - The Postgres container now seeds a `medusa` database automatically so migrations can run on first boot.
3. Seed sample data (optional):
   ```bash
   yarn seed
   ```
4. Ensure the default admin exists if you changed credentials:
   ```bash
   yarn ensure:admin
   ```

Default credentials: `admin@nabd.dhk` / `supersecret12345678`.

## Environment variables

`template.env` is tracked as documentation for the supported variables. Highlights:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` / `REDIS_URL` | Defaults to the Docker network (`postgres://postgres:postgres@db:5432/medusa`, `redis://redis:6379`); override when pointing at external services. |
| `MEDUSA_BACKEND_URL` / `MEDUSA_ADMIN_BACKEND_URL` | Public hostnames for the API and admin, used in outbound links and Admin Lite JWTs. |
| `ADMIN_LITE_JWT_SECRET` | Secret used to sign Admin Lite tokens consumed by the Next.js proxy. |
| `ADMIN_LITE_ALLOWED_ORIGINS` | Comma-separated list of origins allowed to hit the Admin Lite endpoints. `http://localhost:3000` is included for local dev alongside the Vercel previews. |
| `ADMIN_LITE_RATE_LIMIT`, `ADMIN_LITE_RATE_WINDOW_MS` | Rate limiting for Admin Lite operations. |
| `BKASH_*` | Credentials for the bKash payment integration. |
| `MEDUSA_FF_PRODUCT_CATEGORIES` | Feature flag enabling product categories for Admin Lite catalog filters. |

Remember to update the Render service environment with any changes so preview builds behave the same as production.

## Scripts & tooling

| Command | Purpose |
| --- | --- |
| `yarn start` | Runs migrations (via `scripts/migrate-and-start.js`) then starts the Medusa server. |
| `yarn migrate` | Executes pending migrations. |
| `yarn ensure:admin` | Ensures the admin user in `.env` exists and has the desired password. |
| `yarn seed` | Loads seed data from `data/seed.json`. |
| `npm test` | Runs the Supertest integration suite in `test/test.js`. |

The Docker entrypoint uses these scripts automatically so the container stays up-to-date during local development and in Render.

## Render & production deploys

- Render free web services are used for backend preview builds. Link the repository, set the same environment variables as production and Render will run `yarn install && yarn build` automatically.
- For the production droplet, run `var/www/server-config/deploy.sh` from the monorepo root on a fresh server. The script installs dependencies, spins up the Docker stack and links the Nginx configuration.
- Uploaded assets land in the `uploads/` directory which is bind-mounted in production. Back up this directory before redeploying servers.

## Troubleshooting

- **Login loops locally** – confirm `.env` has `NODE_ENV=development` so cookies are not marked `Secure`.
- **Admin Lite 403s** – verify the frontend origin is present in `ADMIN_LITE_ALLOWED_ORIGINS`.
- **Missing migrations** – run `yarn migrate` followed by `yarn ensure:admin` when upgrading Medusa packages.
- **Database resets** – remove the `postgres-data` volume (`docker volume rm medusa-backend_postgres-data`) if you need a clean slate.

