# Medusa Backend (nabd.dhk)

## Local Setup

- Create `./.env` (ensure `NODE_ENV=development` for local HTTP)
- Start stack: `docker compose up -d --build`
- Tail logs: `docker compose logs -f medusa`
- Admin UI: `http://localhost:7001/app`
- Admin API: `http://localhost:7001/admin`

## Default Admin

- Email: `admin@nabd.dhk`
- Password: `supersecret12345678`

The admin user is created/updated by `scripts/ensure-admin.js` during container startup. If you change the password in `.env`, restart the service to re-seed.

## Env File

- `.env` is your local config (ignored by git) and the only file used by the app.
- If you prefer, keep a checked-in `.env.example` for onboarding and copy it to `.env` locally. This repo does not include a template file.

## Notes

- For local HTTP, `.env` should set `NODE_ENV=development` to avoid `Secure` cookies over HTTP.
- If login loops or 401s persist, clear cookies for `localhost` and restart the medusa service.
