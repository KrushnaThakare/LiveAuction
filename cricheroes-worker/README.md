# CricHeroes Authenticated Stats Worker

This service fetches CricHeroes player stats with a real authenticated browser session.
Use it when CricHeroes blocks anonymous backend requests with HTTP 403.

## Why this exists

CricHeroes profile pages may return `403 Forbidden` to datacenter/backend HTTP clients even with browser-like headers.
If your paid CricHeroes account can view stats in a browser, this worker saves that logged-in browser session and reuses it for automated pre-auction stat refreshes.

The worker must run outside the Render backend so CricHeroes fetching does not add load to live auction APIs.

## Setup

```bash
cd cricheroes-worker
cp .env.example .env
npm install
npx playwright install chromium
```

Edit `.env`:

```env
PORT=5055
CRICHEROES_WORKER_TOKEN=a-long-random-secret
CRICHEROES_USER_DATA_DIR=.auth/cricheroes-profile
CRICHEROES_HEADLESS=true
```

## One-time login

CricHeroes uses mobile number, OTP, and Captcha. The worker does not bypass that.
Run a visible browser login on the worker host:

```bash
npm run login
```

In the browser:

1. Log in to CricHeroes with the paid account.
2. Complete OTP and Captcha.
3. Open a player profile and confirm the paid account can see stats.
4. Return to the terminal and press Enter.

This saves cookies/session data under `CRICHEROES_USER_DATA_DIR`.

## Run worker

```bash
npm start
```

Health check:

```bash
curl http://localhost:5055/health
```

Fetch stats:

```bash
curl -X POST http://localhost:5055/fetch-stats \
  -H "Authorization: Bearer $CRICHEROES_WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profileUrl":"https://cricheroes.com/player-profile/7199741/Mayur--Thorat"}'
```

## Backend configuration

Set these on the Spring backend:

```env
CRICHEROES_WORKER_URL=http://your-worker-host:5055
CRICHEROES_WORKER_TOKEN=a-long-random-secret
```

When configured, backend stat refreshes call the worker first. If the worker is not configured, the old direct fetch fallback is used.

## Operational notes

- Fetch stats before the live auction. Overlays use cached stats from your DB.
- If worker returns `AUTH_REQUIRED`, run `npm run login` again because the CricHeroes session expired.
- If worker returns `CRICHEROES_BLOCKED`, run the worker from a network where your paid account browser can access CricHeroes successfully.
- Do not commit `.auth/` or `.env`; both contain sensitive session data.
