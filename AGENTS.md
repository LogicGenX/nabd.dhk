# AGENTS Instructions

## Project Overview

This repository hosts an all-in-one server setup for **nabd.dhk**. It bundles a Next.js front end, Medusa commerce backend, Sanity CMS and Nginx configuration for deployment on a single droplet.

## Repository Structure

- `var/www/frontend-next/` - Next.js 14 + Tailwind front end
- `var/www/medusa-backend/` - Medusa commerce API
- `var/www/sanity-studio/` - Sanity Studio v3
- `var/www/server-config/` - Nginx, PM2 and deployment scripts

## Contribution Guidelines

- Use single quotes for strings and omit semicolons in JavaScript files.
- Run `npm test` inside `var/www/medusa-backend` before committing changes.
- Do not commit generated files unless necessary.
