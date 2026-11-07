# AWS deploy from GitHub (Phase 2)

One codebase on GitHub. **Netlify/Render** use their dashboard env vars. **AWS** uses this folder + `production.env` on the server only.

## One-time on EC2

1. Clone (or pull) this repo, e.g. `/opt/cricket-auction`.
2. Install Docker + Docker Compose plugin.
3. `cp deploy/aws/env.example deploy/aws/production.env` — fill real values (never commit).
4. `chmod +x deploy/aws/deploy.sh`

## Every release (after you push to GitHub)

```bash
cd /opt/cricket-auction
./deploy/aws/deploy.sh
```

That pulls `main`, rebuilds images with `VITE_API_URL` from `production.env`, restarts containers.

## Optional: pull images instead of build

If you use Docker Hub tags (`krushnathakare/...`), set env vars and:

```bash
docker compose -f deploy/aws/docker-compose.pull.yml --env-file deploy/aws/production.env up -d
```

## Backups (Render/Netlify)

Do **not** put ktauction URLs in committed code. Netlify sets `VITE_API_URL` at build time; Render sets `CORS_ORIGINS` and `DB_URL` in its dashboard.
