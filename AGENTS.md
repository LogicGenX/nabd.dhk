# AGENTS Instructions

## Project overview

This repository hosts the complete nabd.dhk platform: a Next.js 14 storefront and Admin Lite dashboard, a Medusa 1.7 backend, a Sanity Studio v3 workspace and the production Nginx/PM2 configuration that ties everything together. The tree under `var/www` mirrors the filesystem layout on the production droplet so deployments can rsync the repo directly.

## Repository structure

- `var/www/frontend-next/` – Next.js App Router storefront, Admin Lite frontend and API proxy routes.
- `var/www/medusa-backend/` – Medusa API, Admin Lite services, Docker Compose stack and automation scripts.
- `var/www/sanity-studio/` – Sanity Studio project used for merchandising and content.
- `var/www/server-config/` – Production and development Nginx configs, PM2 process list and `deploy.sh` bootstrap script.
- `docs/` – Operations runbooks for Admin Lite, catalog metadata and order management.
- `scripts/` – Helper utilities shared across environments.

## Contribution guidelines

- Use single quotes for strings in JavaScript/TypeScript and omit semicolons.
- Stick to Yarn (or npm) scripts defined in each workspace; pnpm is not supported.
- Keep documentation up-to-date—changes to the frontend, backend or ops flows should be reflected in the relevant README or docs file.
- Run the service test suites before committing:
  - `cd var/www/medusa-backend && npm test`
  - `cd var/www/frontend-next && yarn test`
- If you modify Nginx or deployment tooling, describe the impact in the PR summary.
- Free-tier previews run on Vercel (frontend) and Render (backend); make sure environment variables stay in sync with those services when changing configuration.

