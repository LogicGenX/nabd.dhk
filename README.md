# nabd.dhk Platform

An end-to-end commerce stack for **nabd.dhk** that ships the customer storefront, Admin Lite operations dashboard, commerce API, content studio and production reverse proxy in a single repository. The code in `var/www` mirrors the directory layout on the production droplet so the same tree can be copied directly to the server.

## Stack overview

- **Next.js 14 + Tailwind** storefront in `var/www/frontend-next` with a bundled Admin Lite dashboard (`/admin/lite`) and API proxies under `app/api`.
- **Medusa 1.7 backend** in `var/www/medusa-backend` with custom Admin Lite routes (`src/api/admin/lite`), background scripts and a Docker Compose setup for Postgres, Redis and a development Nginx proxy.
- **Sanity Studio v3** in `var/www/sanity-studio` for managing editorial content and custom product metadata that surfaces in the storefront and Admin Lite.
- **Server configuration** in `var/www/server-config` including production Nginx, PM2 process definitions and a bootstrap `deploy.sh` script for new droplets.
- **Operations playbooks** in `docs/` that outline Admin Lite workflows, API guarantees and day-to-day runbooks.

## Repository layout

```text
var/www/
├── frontend-next/      # Next.js app router storefront + Admin Lite frontend
├── medusa-backend/     # Medusa API, Admin Lite services, Docker Compose stack
├── sanity-studio/      # Sanity Studio v3 project
└── server-config/      # Nginx configs, PM2 ecosystem file, deploy script
```

Additional documentation lives in `docs/`, and helper scripts outside of `var/www` sit under `scripts/`.

## Hosted testing environment

Free tier deployments are used for smoke testing:

- **Frontend previews** run on Vercel (Hobby tier) which mirrors the production Next.js build and Admin Lite proxy behaviour.
- **Backend previews** run on Render (free web service) to validate Medusa builds, migrations and Admin Lite APIs before shipping to the droplet.

Keep `.env` files in sync with these environments so staged changes match production behaviour.

## Prerequisites

- Node.js 20 with Corepack enabled (Yarn 1.x is committed via `packageManager`).
- Docker and Docker Compose (for the Medusa stack, Postgres and Redis).
- pnpm is **not** used; stick to Yarn or npm scripts declared in the repos.
- Access to the private environment variables for Medusa, Sanity and third-party integrations.

## Local development

1. **Bootstrap the Medusa stack**
```bash
cd var/www/medusa-backend
cp template.env .env        # or copy your own secrets
docker compose up --build
```
- Postgres, Redis, Medusa and an Nginx reverse proxy are launched. Nginx exposes port 80 and proxies `http://localhost` to Medusa on `http://localhost:7001`.
- Default admin credentials are seeded automatically (`admin@nabd.dhk` / `supersecret12345678`).
- The generated `.env` ships with local Docker defaults (database on `db`, Redis on `redis`, Admin Lite origins including `http://localhost:3000`). Update any values before running Compose if you need different ports or secrets.

2. **Run the storefront + Admin Lite frontend**
```bash
cd var/www/frontend-next
yarn install
yarn dev
```
- The app reads `MEDUSA_BACKEND_URL` / `NEXT_PUBLIC_MEDUSA_URL` to discover the API; when absent it falls back to the local proxy (`http://localhost` in development).
- `.env.local` in the repo already points to `http://localhost:7001` so the Admin Lite proxy and storefront talk to the Dockerised Medusa instance out of the box. Adjust Sanity variables as needed.

3. **Run Sanity Studio (optional)**
   ```bash
   cd var/www/sanity-studio
   yarn install
   yarn dev
   ```
   - Provide `SANITY_STUDIO_PROJECT_ID` and related env vars before running `yarn dev` for authenticated datasets.

4. **Admin Lite access**
   - Visit `http://localhost:3000/admin/lite` once both the frontend and Medusa services are running.
   - For the Medusa Admin UI use `http://localhost:7001/app` (the legacy `/admin` path only serves the API).

When running the Docker stack, avoid starting a host-level Nginx instance on port 80 to prevent conflicts with the Compose proxy.

## Environment configuration

### Frontend (`var/www/frontend-next`)

| Variable | Purpose |
| --- | --- |
| `MEDUSA_BACKEND_URL` | Explicit Medusa origin for API routes and Admin Lite proxies (e.g. `https://api.nabd.dhk`). |
| `NEXT_PUBLIC_MEDUSA_URL` | Public Medusa origin used by the storefront client. Falls back to `MEDUSA_BACKEND_URL`. |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` | Sanity dataset identifiers for the storefront queries. |
| `SANITY_API_READ_TOKEN` | Optional server-side token for authenticated Sanity reads. |
| `ADMIN_LITE_CURRENCY_CODE` | Overrides the default BDT currency code for Admin Lite pricing helpers. |

### Medusa backend (`var/www/medusa-backend`)

`template.env` documents the full set of variables. Key values include:

- `DATABASE_URL` / `REDIS_URL` for external services when Docker is not used.
- `MEDUSA_BACKEND_URL` and `MEDUSA_ADMIN_BACKEND_URL` which should point to the public Render or droplet domain when deploying.
- `ADMIN_LITE_JWT_SECRET`, `ADMIN_LITE_ALLOWED_ORIGINS` and `ADMIN_LITE_RATE_*` for locking down the Admin Lite API consumed by the Next.js proxy.
- `MEDUSA_FF_PRODUCT_CATEGORIES=true` ensures the product categories feature flag is enabled for catalog filtering.
- `BKASH_*` credentials are required if the bKash payment integration is activated.

## Testing & quality gates

Run the service-specific suites before pushing changes:

```bash
# Medusa API tests (Supertest suite)
cd var/www/medusa-backend
npm test

# Frontend unit tests (Vitest)
cd ../frontend-next
yarn test
```

`yarn lint` inside `frontend-next` runs Next.js linting if you are changing React components.

## Deployment workflow

- `var/www/server-config/deploy.sh` installs system dependencies, builds the frontend and Sanity Studio, launches the Medusa Docker stack and links the production Nginx config. Set `DOMAIN` and `EMAIL` env vars (or pass them as arguments) before running the script on a new droplet.
- PM2 processes are defined in `var/www/server-config/pm2-universe.json` and manage long-running Next.js and Sanity builds when deployed outside Docker.
- Production Nginx configuration (`nginx.conf`) proxies `/` to the Next.js app, `/app` and `/admin` to Medusa, and `/studio` to Sanity.

## Operations documentation

Detailed Admin Lite workflows, troubleshooting guides and deployment checklists live in `docs/`:

- `admin-lite-sop.md` – daily operations runbook and smoke tests.
- `admin-lite-orders-api.md` – API surface area for the Admin Lite orders endpoints.
- `admin-lite-fields.md` – schema notes for custom metadata.

Review these documents before changing the Admin Lite API or frontend to ensure backwards compatibility.

## Default credentials & safety notes

- Local admin user: `admin@nabd.dhk` / `supersecret12345678`.
- Clear browser cookies and confirm `NODE_ENV=development` in `.env` if you encounter login loops while developing over HTTP.
- Keep production secrets out of source control; only `template.env` is tracked for reference.

