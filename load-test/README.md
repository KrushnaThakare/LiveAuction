# Load testing — Cricket Auction

Simulate hundreds of people opening the **broadcaster / view link** during a live auction.

**Never load-test production.** Use a separate **staging** environment (steps below).

---

## What gets tested

Each virtual viewer (like opening `/view/{tournamentId}`) does:

1. `GET /api/overlay/{id}/config`
2. `GET /api/overlay/{id}/snapshot`
3. WebSocket → `/ws-overlay-native` → STOMP subscribe `/topic/overlay/{id}/snapshot`
4. Stays connected while bids/sells push updates

| Script | Purpose |
|--------|---------|
| `scripts/smoke.js` | 5 users, 2 min — sanity check |
| `scripts/overlay-viewers.js` | Main test — ramp to 100–500 viewers |
| `scripts/overlay-poll-only.js` | Stress test — HTTP poll every 3s (no WebSocket) |
| `scripts/auction-bids.js` | 1 admin VU placing bids during viewer test |

---

## Install k6

**macOS (Homebrew):**
```bash
brew install k6
```

**Linux (Debian/Ubuntu):**
```bash
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A6542E344CF7EB48D1D0FD81
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt update && sudo apt install k6
```

**Windows:** [k6 installer](https://grafana.com/docs/k6/latest/set-up/install-k6/)

Verify: `k6 version`

---

## Part 1 — Set up staging environment

Staging must be a **separate copy** of production (own backend, database, frontend URL). Do not point load tests at your live Render production service.

### Option A — Render + Netlify (recommended, mirrors production)

#### Step 1: Staging MySQL database

1. Open [Render Dashboard](https://dashboard.render.com) → **New** → **PostgreSQL** is *not* what you need — use **MySQL** from an external provider or Render if you already use one.
2. If you use the same MySQL host as production, create a **new database** e.g. `cricket_auction_staging`.
3. Note: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.

#### Step 2: Staging backend on Render

1. **New** → **Web Service** → connect your GitHub repo.
2. Name it e.g. `cricket-auction-backend-staging`.
3. **Branch:** `main` (or your staging branch).
4. **Root directory:** `backend`
5. **Runtime:** Docker (same as `render.yaml`).
6. **Plan:** match production (at least Starter if you test 200+ users).
7. **Environment variables:**

| Key | Value |
|-----|-------|
| `DB_URL` | `jdbc:mysql://HOST:3306/cricket_auction_staging?useSSL=...` |
| `DB_USERNAME` | your DB user |
| `DB_PASSWORD` | your DB password |
| `JWT_SECRET` | new random string (different from prod) |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | strong staging-only password |
| `CORS_ORIGINS` | staging frontend URL (set after Step 3) |
| `UPLOAD_DIR` | `/tmp/cricket-auction-uploads` |

8. Deploy and copy the URL, e.g. `https://cricket-auction-backend-staging.onrender.com`

#### Step 3: Staging frontend on Netlify

1. Netlify → **Add new site** → import same repo (or duplicate existing site).
2. Site name e.g. `cricket-auction-staging`.
3. **Build command:** `cd frontend && npm run build`
4. **Publish directory:** `frontend/dist`
5. **Environment variable:**

```
VITE_API_URL=https://cricket-auction-backend-staging.onrender.com/api
```

6. Deploy → copy URL e.g. `https://cricket-auction-staging.netlify.app`

#### Step 4: Link CORS

1. Render staging backend → **Environment** → set:
   ```
   CORS_ORIGINS=https://cricket-auction-staging.netlify.app
   ```
2. Redeploy backend.

#### Step 5: Prepare staging tournament data

1. Open `https://cricket-auction-staging.netlify.app` → login with staging admin.
2. Create a tournament.
3. Upload players (Excel) and create teams.
4. **Broadcast** → enable overlay / broadcast.
5. Note the **tournament ID** from the URL or tournament list.
6. Copy the public view link: `https://cricket-auction-staging.netlify.app/view/{tournamentId}`

---

### Option B — Local staging (docker-compose + k6 on your laptop)

Good for development; does not reflect Render network limits.

```bash
# Terminal 1 — full stack
docker-compose up --build

# Frontend uses backend at localhost:8080
cd frontend && cp .env.example .env.local
# VITE_API_URL=http://localhost:8080/api
npm run dev
```

Load test against local API:

```bash
API_URL=http://localhost:8080/api TOURNAMENT_ID=1 ./load-test/run.sh smoke
```

---

## Part 2 — Configure load tests

```bash
cd load-test
cp .env.example .env
# Edit .env with staging API_URL, TOURNAMENT_ID, ADMIN_PASSWORD, TEAM_ID
chmod +x run.sh
```

**Find `TEAM_ID`:** staging admin → Teams page → first team (usually `1`).

---

## Part 3 — Run tests (step by step)

### 1) Smoke test (always run first)

```bash
./load-test/run.sh smoke
```

Expect: `checks...............: 100%`, `http_req_failed: 0%`.

### 2) Start a live auction (manual)

On staging admin UI:

1. Go to **Auction**.
2. **Start** a player auction.
3. Leave it **ACTIVE**.

### 3) Main viewer load test

**Terminal 1** — simulate viewers:

```bash
# Default ramp to 100 users
./load-test/run.sh viewers

# Or target 300 users
VUS_MAX=300 STAGES="2m:100,3m:300,10m:300,2m:0" ./load-test/run.sh viewers
```

**Terminal 2** — simulate bidding during the test:

```bash
./load-test/run.sh bids
```

### 4) Optional — poll-only stress (careful)

Simulates WebSocket failure (everyone polling every 3s). **Start with 20 users only:**

```bash
VUS_MAX=20 ./load-test/run.sh poll
```

Watch Render logs for `HikariPool` errors.

---

## Part 4 — Read results

k6 prints a summary when the test ends:

| Metric | Good | Investigate |
|--------|------|-------------|
| `http_req_failed` | &lt; 1% | &gt; 5% |
| `http_req_duration` p(95) | &lt; 800 ms | &gt; 2 s |
| `overlay_ws_connect_ms` p(95) | &lt; 2 s | &gt; 5 s |
| `overlay_ws_messages` | grows during bids | flat while bidding |

**Render dashboard** (staging backend): CPU, memory, restarts.

**Backend logs:** search for `HikariPool`, `Connection is not available`, `500` errors.

**Manual spot-check:** open `/view/{id}` on 2–3 phones while k6 runs — bids should update within ~1–2 seconds.

---

## Suggested test progression

| Day | Users | Goal |
|-----|-------|------|
| 1 | 10 (smoke) | Scripts work, staging OK |
| 2 | 50 | Baseline latency |
| 3 | 100 | Target small event |
| 4 | 200–300 | WhatsApp share scale |
| 5 | 500 | Max plan validation |

Increase `VUS_MAX` only if previous step had &lt; 1% errors and no pool timeouts.

---

## Environment reference

| Variable | Description |
|----------|-------------|
| `API_URL` | Backend with `/api` suffix |
| `TOURNAMENT_ID` | Tournament under test |
| `OVERLAY_TOKEN` | Optional; leave empty for `/view` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | For `auction-bids.js` |
| `TEAM_ID` | Team used in bid script |
| `VUS_MAX` | Peak virtual users (`overlay-viewers.js`) |
| `STAGES` | Custom ramp, e.g. `1m:50,5m:200,1m:0` |
| `VIEWER_DURATION_SEC` | How long each VU stays connected (default 600) |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| CORS errors in browser | Set `CORS_ORIGINS` on staging backend to exact frontend URL |
| `config 403` / invalid token | Set `OVERLAY_TOKEN` in `.env` or disable overlay secret in broadcast settings |
| WebSocket fails, high DB load | Viewers fall back to 3s polling — fix WS on Render or reduce `VUS_MAX` |
| `HikariPool` timeouts | Too many polls or pool too small — don't run `poll` test at high VUs on free tier |
| `bid accepted` fails | Start an auction first; check `TEAM_ID` and team budget |
| Render sleeps (free plan) | Upgrade staging to Starter or use a keep-alive ping during tests |

---

## Files

```
load-test/
├── README.md                 ← this guide
├── .env.example
├── run.sh                    ← helper: loads .env and runs k6
├── lib/
│   ├── config.js
│   └── stomp.js
└── scripts/
    ├── smoke.js
    ├── overlay-viewers.js
    ├── overlay-poll-only.js
    └── auction-bids.js
```

---

## Safety reminder

- Staging only — production load tests can take the real auction offline.
- Do **not** open 50+ real Playwright/Chromium tabs on Render (heavy; exhausts DB pool).
- Use **k6** for 100–500 users; use 5–10 real phones for a final UI sanity check.
