# nabd.dhk

This repository contains an all-in-one server setup for **nabd.dhk**.
It bundles a Next.js front end, a Medusa commerce backend, a Sanity CMS and
Nginx configuration for deployment on a single droplet.

```
var/www/
├── frontend-next/      # Next.js 14 + Tailwind
├── medusa-backend/     # Medusa commerce API
├── sanity-studio/      # Sanity Studio v3
└── server-config/      # Nginx, PM2 and deploy script
```

> **Note**
>
> The Sanity schema at `sanity-studio/schemas/product.js` is experimental and
> currently omitted from `schemas/index.ts`. It will remain excluded until the
> mapping to the Medusa backend is finalized.

## Setup Guide

1. Fill in environment variables in `medusa-backend/.env.template` and copy
   to `.env`.
2. Run the one-shot deployment script on your server:

```bash
sudo bash server-config/deploy.sh
```

The services will be available at:
- Frontend: `http://<your-domain>`
- Medusa API: `http://<your-domain>/api/`
- Sanity Studio: `http://<your-domain>/studio/`
- Medusa Admin: `http://<your-domain>/app/`

A sample seed file is included for Medusa in `medusa-backend/data/seed.json`.

## Admin UI

The Medusa backend now serves the admin dashboard at `/app/`. The `/admin/`
path is reserved for the API itself, so attempting to access the dashboard at
`/admin` will result in authentication loops. Use `/app/` to manage products,
handle orders and track inventory. Custom collections such as lookbook images
or site settings can be added through Sanity Studio and surfaced inside the admin
using custom widgets.
