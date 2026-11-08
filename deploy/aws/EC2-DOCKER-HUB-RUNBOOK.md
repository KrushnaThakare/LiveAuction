# ktauction.in — update server after code changes (Docker Hub + EC2)

Use this checklist whenever you change the app and want **https://ktauction.in** updated **without** breaking the database, uploads, or nginx.

You use **pre-built images** on the server (`krushnathakare/cricket-auction-*:latest`), not building on EC2.

---

## Quick checklist

| Step | Where | Action |
|------|--------|--------|
| 1 | Your PC (IntelliJ) | Change code, test locally if you can |
| 2 | Your PC (Docker) | Build + push **backend** and/or **frontend** images |
| 3 | EC2 (SSH) | `docker compose pull` then `docker compose up -d` |
| 4 | Browser | Hard refresh ktauction.in, smoke-test auction + one upload |

**Do not** delete `~/docker-compose.yml` or run `docker compose down -v` unless you mean to wipe the database.

---

## Part 1 — On your PC (after you merge or are ready to release)

### 1.1 Prerequisites

- Docker Desktop running (IntelliJ “Cannot connect to Docker daemon” = start Docker first).
- Logged in to Docker Hub: `docker login` (user `krushnathakare` or your Hub account with push access).

### 1.2 Backend — only if you changed Java/backend

From the repo root:

```bash
cd backend
docker build -t krushnathakare/cricket-auction-backend:latest .
docker push krushnathakare/cricket-auction-backend:latest
```

### 1.3 Frontend — if you changed React/UI (or nginx)

The site calls the API through the **same domain** (`/api/` via nginx). Build with:

```bash
cd frontend
docker build \
  --build-arg VITE_API_URL=https://ktauction.in/api \
  -t krushnathakare/cricket-auction-frontend:latest .
docker push krushnathakare/cricket-auction-frontend:latest
```

> If you skip frontend but only pushed backend, you only need to pull the backend image on EC2 (see below).

### 1.4 Wait for Docker Hub

After `docker push`, give Hub ~1–2 minutes so `latest` is updated before you pull on EC2.

---

## Part 2 — On EC2 (every deploy)

### 2.1 Connect

```bash
ssh -i /path/to/your-key.pem ubuntu@13.200.88.0
```

If **connection timed out**: AWS Console → EC2 → instance **Running** (not Stopped). Elastic IP should still be `13.200.88.0`.

### 2.2 Go to compose file

```bash
cd ~
ls -la docker-compose.yml
```

File must exist and show ~50 lines. If missing, restore from **[Backup: `docker-compose.yml`](#backup-docker-composeyml)** (bottom of this doc).

### 2.3 Pull new images and restart (safe routine)

```bash
docker compose pull
docker compose up -d
docker ps
```

- **Keeps** MySQL data (`mysql_data` volume).
- **Keeps** uploaded logos/photos (`cricket_uploads`, `cricket_images` volumes) as long as the compose file still mounts them on **backend**.

You do **not** need `docker compose down` for normal updates.

### 2.4 Quick health check on the server

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/tournaments
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
```

Expect `200` or `401` on API (auth), and `200` on frontend.

### 2.5 On the website

- Open https://ktauction.in and hard refresh (Ctrl+Shift+R).
- Click through one screen you changed.
- If you touched uploads: try a small logo upload (&lt; 10 MB).

---

## What you must never do (unless you know the cost)

| Command / action | Risk |
|------------------|------|
| `sudo rm ~/docker-compose.yml` | Next `compose up` may miss volumes → **404 logos** |
| `docker compose down -v` | **Deletes MySQL + uploads** |
| Recreate backend **without** `cricket_uploads` / `cricket_images` volumes | Files gone; DB still has old URLs → **broken images** |
| Only `docker compose up -d` without `pull` | Server keeps **old** images; site looks unchanged |
| Edit nginx inside the container | Works until container is recreated; prefer **new frontend image** with `frontend/nginx.conf` (`client_max_body_size 12m`) |

---

## Troubleshooting (short)

### Site unchanged after deploy

```bash
docker compose pull
docker compose up -d
docker inspect cricket-auction-frontend --format '{{.Image}}'
```

Check image ID/date changed. Then hard refresh the browser.

### 413 on image upload

- Preferred: push a **new frontend image** built from current repo (nginx already allows 12m).
- Emergency (old image on server): see [README — Uploads](./README.md#uploads-logos-player-photos-on-ec2).

### Broken tournament/team logos (404)

- Backend volumes missing → fix `docker-compose.yml`, `docker compose up -d`, **re-upload** logos.
- Do not wipe volumes.

### Permission denied editing compose

```bash
sudo nano /home/ubuntu/docker-compose.yml
```

Save: Ctrl+O, Enter, Ctrl+X.

---

## Optional: copy canonical compose from repo

If you clone the repo on EC2:

```bash
docker compose -f deploy/aws/docker-compose.ec2.yml up -d
```

Adjust paths/env to match your setup. Your working setup today uses `~/docker-compose.yml` in the home directory — that is fine; keep **one** copy and back it up.

---

## Backup: `docker-compose.yml`

Save this on EC2 at **`/home/ubuntu/docker-compose.yml`**. Also keep a copy in Google Drive / password manager notes.

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: cricket-auction-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: cricket_auction
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-uroot", "-proot"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: krushnathakare/cricket-auction-backend:latest
    container_name: cricket-auction-backend
    restart: unless-stopped
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      DB_USERNAME: root
      DB_PASSWORD: root
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/cricket_auction?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
      CORS_ORIGINS: https://ktauction.in,https://www.ktauction.in
    ports:
      - "8080:8080"
    volumes:
      - cricket_uploads:/tmp/cricket-auction-uploads
      - cricket_images:/tmp/cricket-auction-images

  frontend:
    image: krushnathakare/cricket-auction-frontend:latest
    container_name: cricket-auction-frontend
    restart: unless-stopped
    depends_on:
      - backend
    ports:
      - "3000:80"

volumes:
  mysql_data:
  cricket_uploads:
  cricket_images:
```

---

## Cloudflare tunnel

If `ktauction.in` goes through **cloudflared** on this box, you usually **do not** restart it for app updates—only when you change ports or the tunnel config. After deploy, if the public site is down, check:

```bash
sudo systemctl status cloudflared
```

(Exact service name may differ on your instance.)

---

## One-line “happy path” (copy for notes)

**PC:** build/push image(s) → **EC2:** `ssh` → `cd ~` → `docker compose pull && docker compose up -d` → **Browser:** hard refresh ktauction.in.
