# AWS deploy from GitHub (Phase 2)

One codebase on GitHub. **Netlify/Render** use their dashboard env vars. **AWS** uses this folder + `production.env` on the server only.

**EC2 + Docker Hub (ktauction.in):** step-by-step release checklist → **[EC2-DOCKER-HUB-RUNBOOK.md](./EC2-DOCKER-HUB-RUNBOOK.md)**. Canonical server compose → `docker-compose.ec2.yml`.

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

## Uploads (logos, player photos) on EC2

Backend stores files under `/tmp/cricket-auction-uploads` inside the **backend** container. Without a Docker volume, files disappear when you recreate the container (`compose up --force-recreate`, `down`, or instance rebuild). MySQL keeps logo **URLs**, so the UI shows broken images (404).

Add to your **backend** service in `docker-compose.yml`:

```yaml
  backend:
    volumes:
      - cricket_uploads:/tmp/cricket-auction-uploads
      - cricket_images:/tmp/cricket-auction-images

volumes:
  cricket_uploads:
  cricket_images:
```

Re-upload tournament/team logos once. Optional: set `CLOUDINARY_*` env vars for cloud-backed storage.

The frontend nginx image proxies `/api/` uploads; it must allow at least 10MB (`client_max_body_size` in `frontend/nginx.conf`) or uploads return **413**.

## Backups (Render/Netlify)

Do **not** put ktauction URLs in committed code. Netlify sets `VITE_API_URL` at build time; Render sets `CORS_ORIGINS` and `DB_URL` in its dashboard.
