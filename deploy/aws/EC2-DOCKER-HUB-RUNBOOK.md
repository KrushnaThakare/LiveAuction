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
docker build --platform linux/arm64 -t krushnathakare/cricket-auction-backend:latest .
docker push krushnathakare/cricket-auction-backend:latest
```

> **EC2 is ARM (Graviton)** — your tunnel dashboard shows `linux_arm64`. If you build on Intel Windows/Mac **without** `--platform linux/arm64`, images may be `amd64` and containers exit with `exec format error`. Building on Apple Silicon without the flag usually already produces `arm64`.

### 1.3 Frontend — if you changed React/UI (or nginx)

**Option A (recommended with your tunnel):** API through the **main site** — nginx in the frontend container proxies `/api/` to the backend container.

```bash
cd frontend
docker build --platform linux/arm64 \
  --build-arg VITE_API_URL=https://ktauction.in/api \
  -t krushnathakare/cricket-auction-frontend:latest .
docker push krushnathakare/cricket-auction-frontend:latest
```

**Option B:** API on the subdomain (works even when debugging backend only):

```bash
docker build --platform linux/arm64 \
  --build-arg VITE_API_URL=https://backend.ktauction.in/api \
  ...
```

If you use Option B, set backend `CORS_ORIGINS` to include `https://ktauction.in` (your compose already does).

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

### 502 Bad Gateway (Cloudflare: Host = Error)

Cloudflare is up but **nothing healthy is answering on the EC2 origin** (usually port **3000** for the frontend, via `cloudflared` or your tunnel).

**On EC2 (SSH):**

```bash
cd ~
docker ps -a
docker compose logs --tail=80 frontend
docker compose logs --tail=120 backend
docker compose logs --tail=40 mysql
curl -s -o /dev/null -w "frontend %{http_code}\n" http://127.0.0.1:3000/
curl -s -o /dev/null -w "backend %{http_code}\n" http://127.0.0.1:8080/api/tournaments
sudo systemctl status cloudflared   # if you use a tunnel on this box
```

| What you see | Likely fix |
|----------------|------------|
| `frontend`/`backend` **Exited** or **Restarting** | Read `docker compose logs` for the failing service (OOM, DB, `exec format error`) |
| `exec format error` in logs | Image built on Apple Silicon without `linux/amd64`. Rebuild: `docker build --platform linux/amd64 ...` then push and pull again |
| `frontend` missing, only mysql | `docker compose up -d` — wait until mysql healthy, then backend, then frontend |
| `curl localhost:3000` = **200** but site still 502 | Restart tunnel: `sudo systemctl restart cloudflared` (or check Cloudflare Zero Trust → tunnel → origin URL = `http://localhost:3000`) |
| Backend can’t connect to MySQL | Keep `SPRING_DATASOURCE_URL` / `jdbc:mysql://mysql:3306/...` in `~/docker-compose.yml`; don’t run backend alone without compose network |
| Disk full | `df -h` then `docker system prune -f` (not `-v` unless you accept data loss) |

**Fast recovery (same images):**

```bash
cd ~
docker compose pull
docker compose up -d
sleep 45
docker ps
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
```

**Rollback:** if the new `:latest` image is bad, on PC push a known-good tag or rebuild from last good `main`, then on EC2 `docker compose pull && docker compose up -d`.

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

## Cloudflare tunnel (ktauction.in)

| Public hostname | Service (origin on EC2 host) | What it is |
|-----------------|-----------------------------|------------|
| `ktauction.in` | `http://127.0.0.1:3000` | Frontend nginx (React + `/api` proxy) |
| `backend.ktauction.in` | `http://127.0.0.1:8080` | Spring Boot API (direct) |

Use **`127.0.0.1`** instead of `localhost` for `ktauction.in` if logs show **Unable to reach the origin service** while `curl http://127.0.0.1:3000/` returns **200** (IPv6 `::1` vs IPv4 mismatch on some hosts).

After changing routes in Zero Trust, run:

```bash
sudo systemctl restart cloudflared
curl -s -o /dev/null -w "local %{http_code}\n" http://127.0.0.1:3000/
curl -s -o /dev/null -w "public %{http_code}\n" https://ktauction.in/
```

If **local 200** but **public 502**: tunnel origin URL or stale connector — recheck Routes tab (no duplicate hostname to port 80/8080).

`VITE_API_URL=https://ktauction.in/api` is **correct** for Option A above; it does **not** cause 502 on the home page (that is always tunnel → port 3000).

If `ktauction.in` goes through **cloudflared** on this box, you usually **do not** restart it for app updates—only when you change ports or the tunnel config. After deploy, if the public site is down, check:

```bash
sudo systemctl status cloudflared
journalctl -u cloudflared -n 20 --no-pager
```

(Exact service name may differ on your instance.)

---

## One-line “happy path” (copy for notes)

**PC:** build/push image(s) → **EC2:** `ssh` → `cd ~` → `docker compose pull && docker compose up -d` → **Browser:** hard refresh ktauction.in.
