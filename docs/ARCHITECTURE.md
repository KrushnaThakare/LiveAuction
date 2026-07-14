# Cricket Auction Platform — System Architecture

This document describes how the application is built, how data flows between components, and how each major feature connects end-to-end.

---

## 1. High-level system context

```mermaid
flowchart TB
    subgraph Clients["Client browsers / OBS"]
        ADMIN["Admin UI\n(React SPA)"]
        AUCTION["Live Auction desk\n/auction"]
        LED["Audience Display\n/auction-display"]
        OBS["OBS Browser Sources\n/overlay/*"]
        PUBLIC["Public pages\n/view, /register"]
    end

    subgraph Frontend["Frontend — React 19 + Vite"]
        SPA["Single Page App\nfrontend/src"]
    end

    subgraph Backend["Backend — Spring Boot 3.2"]
        API["REST API\n/api/*"]
        WS["WebSocket STOMP\n/ws-overlay-native"]
        SVC["Services\nAuction, Team, Player, Overlay"]
        PUSH["OverlayPushService\n@Async"]
    end

    subgraph Data["Data layer"]
        DB[(MySQL 8)]
        FILES["Uploads / images"]
    end

    subgraph External["Optional external"]
        WA["WhatsApp API"]
        CH["CricHeroes"]
    end

    ADMIN --> SPA
    AUCTION --> SPA
    LED --> SPA
    OBS --> SPA
    PUBLIC --> SPA

    SPA -->|"HTTPS REST + JWT"| API
    SPA -->|"WSS STOMP"| WS

    API --> SVC
    WS --> SVC
    SVC --> DB
    SVC --> FILES
    SVC --> PUSH
    PUSH --> WS
    SVC --> WA
    SVC --> CH
```

### Deployment (Docker Compose)

| Service | Port | Role |
|---------|------|------|
| `frontend` | 3000 → nginx 80 | Serves built React app |
| `backend` | 8080 | Spring Boot API + WebSocket |
| `mysql` | 3306 | Persistent tournament data |

Production typically adds a reverse proxy (Nginx / Cloudflare) in front with **WebSocket upgrade** enabled for `/ws-overlay-native`.

---

## 2. Application layers

```mermaid
flowchart LR
    subgraph Presentation["Presentation (frontend)"]
        PAGES["pages/*.jsx"]
        HOOKS["hooks/"]
        API_CLIENT["api/*.js — Axios"]
        CTX["contexts/\nAuth, Tournament, Theme"]
    end

    subgraph HTTP["HTTP boundary"]
        CTRL["controllers/"]
    end

    subgraph Business["Business logic"]
        AUC_SVC["AuctionService"]
        TEAM_SVC["TeamService"]
        PLAYER_SVC["PlayerService"]
        OVERLAY_SVC["OverlayPushService"]
        REG_SVC["PlayerRegistrationService"]
    end

    subgraph Persistence["Persistence"]
        REPO["JPA repositories"]
        ENT["entities/"]
    end

    PAGES --> HOOKS --> API_CLIENT
    PAGES --> CTX
    API_CLIENT --> CTRL
    CTRL --> AUC_SVC & TEAM_SVC & PLAYER_SVC & REG_SVC
    AUC_SVC --> OVERLAY_SVC
    AUC_SVC --> REPO
    TEAM_SVC --> REPO
    PLAYER_SVC --> REPO
    REPO --> ENT
```

### Key backend services

| Service | Responsibility |
|---------|----------------|
| `AuctionService` | Auction state machine: start, bid, sell, unsold, undo, stop |
| `TeamService` | Teams, budgets, squad rosters |
| `PlayerService` | Player CRUD, Excel import, retained players, CricHeroes |
| `OverlayPushService` | Async WebSocket snapshot push to all overlay subscribers |
| `OverlayController` | Public overlay config + snapshot HTTP API |
| `PlayerRegistrationService` | Public form submissions → import to players |
| `WhatsAppNotifyService` | Optional sold notifications |
| `BidRuleService` | Dynamic bid increment rules per tournament |

### Key frontend modules

| Path | Responsibility |
|------|----------------|
| `pages/AuctionPage.jsx` | Operator auction desk |
| `hooks/useOverlayRealtime.js` | WebSocket + HTTP fallback for all overlays |
| `pages/AuctionDisplayPage.jsx` | Venue LED / audience display |
| `pages/Overlay*.jsx` | OBS broadcast overlays |
| `contexts/AuthContext.jsx` | JWT login, roles |
| `contexts/TournamentContext.jsx` | Active tournament scope |

---

## 3. Security & roles

```mermaid
flowchart TD
    LOGIN["POST /api/auth/login"] --> JWT["JWT token\nlocalStorage"]
    JWT --> REQ["Authenticated API requests\nAuthorization: Bearer"]

    REQ --> SA["SUPER_ADMIN\nFull access"]
    REQ --> OP["OPERATOR\nAuction + broadcast"]
    REQ --> VW["VIEWER\nRead-only GET"]

    PUBLIC["Public routes\nNo JWT"] --> OVL["GET /api/overlay/*"]
    PUBLIC --> REG["POST /api/registration/*"]
    PUBLIC --> VIEW["GET tournament/teams/players/auction/state"]
    PUBLIC --> WS_PUB["WebSocket /ws-overlay-native"]
```

| Role | Frontend routes | Backend write access |
|------|-----------------|----------------------|
| **SUPER_ADMIN** | All + Users, Logs, Form Builder | Tournaments, users, all operator actions |
| **OPERATOR** | Auction, Broadcast, Registrations | Auction, teams, players, broadcast settings |
| **VIEWER** | Home, Players, Teams, Sold, Unsold | Read-only (GET) |
| **Public** | `/view`, `/register`, `/overlay/*`, `/auction-display` | Overlay snapshot GET, registration POST |

JWT is **stateless** — no server session. Each request is authorized via `JwtFilter`.

---

## 4. Tournament data model (conceptual)

```mermaid
erDiagram
    TOURNAMENT ||--o{ TEAM : has
    TOURNAMENT ||--o{ PLAYER : has
    TOURNAMENT ||--o{ BID_RULE : has
    TOURNAMENT ||--o{ FORM_SECTION : has
    TOURNAMENT ||--o{ PLAYER_REGISTRATION : receives

    TEAM ||--o{ PLAYER : squad
    PLAYER }o--|| TEAM : sold_to

    TOURNAMENT ||--o{ AUCTION_SESSION : runs
    AUCTION_SESSION ||--|| PLAYER : current_lot

    PLAYER {
        long id
        string name
        string role
        double basePrice
        double currentBid
        enum status
        boolean retained
    }

    TEAM {
        long id
        string name
        double budget
        double remainingBudget
    }

    TOURNAMENT {
        long id
        string name
        int maxSquadSize
        boolean overlayEnabled
        string overlaySecretToken
    }
```

**Player status lifecycle:** `AVAILABLE` → `IN_AUCTION` → `SOLD` | `UNSOLD` (undo can revert)

---

## 5. Authentication flow

```mermaid
sequenceDiagram
    actor User
    participant Login as LoginPage
    participant API as AuthController
    participant DB as MySQL
    participant App as Admin pages

    User->>Login: username + password
    Login->>API: POST /api/auth/login
    API->>DB: validate AppUser
    API-->>Login: JWT + user role
    Login->>Login: store token in localStorage
    Login->>App: redirect to Home
    App->>API: requests with Bearer JWT
```

---

## 6. Live auction flow (core)

This is the heart of the system. **Every auction action goes through the REST API on the server.** The server then pushes updates to all overlay clients.

```mermaid
sequenceDiagram
    actor Operator
    participant AP as AuctionPage
    participant API as AuctionController
    participant AS as AuctionService
    participant OPS as OverlayPushService
    participant WS as WebSocket broker
    participant LED as Audience Display
    participant OBS as OBS overlays

    Operator->>AP: Pick player / assign bid / SOLD
    AP->>API: POST /auction/start|bid|sell|unsold
    API->>AS: business logic + DB update
    AS-->>API: AuctionStateResponse
    API->>OPS: pushLightweightSnapshot (async)
    API->>OPS: pushSquadSnapshot on sell/undo (async)
    OPS->>WS: /topic/overlay/{tournamentId}/snapshot
    WS-->>LED: JSON snapshot
    WS-->>OBS: JSON snapshot
    API-->>AP: response + update local UI
```

### Auction API endpoints

| Action | Endpoint | Overlay push |
|--------|----------|--------------|
| Start player | `POST .../auction/start/{playerId}` | Lightweight |
| Assign bid | `POST .../auction/bid` | Lightweight |
| Update calling bid | `POST .../auction/calling-bid` | Lightweight |
| **Sell** | `POST .../auction/sell` | Lightweight + **Squad** |
| Unsold | `POST .../auction/unsold` | Lightweight |
| Stop | `POST .../auction/stop` | Lightweight |
| Undo | `POST .../auction/undo` | Lightweight + Squad |

**Lightweight snapshot** = auction state + team summaries (budget, playerCount, no full rosters).  
**Squad snapshot** = full team player lists (for squad overlays / ceremony).

---

## 7. Realtime overlay architecture (critical for multi-PC)

```mermaid
flowchart TB
    subgraph PC1["PC 1 — Auction operator"]
        AUC["/auction"]
    end

    subgraph Server["Backend server"]
        REST["REST API"]
        PUSH["OverlayPushService"]
        BROKER["STOMP /topic/overlay/{id}/snapshot"]
        SNAP["GET /api/overlay/{id}/snapshot"]
    end

    subgraph PC2["PC 2 — LED screen"]
        DISPLAY["/auction-display"]
        HOOK2["useOverlayRealtime"]
    end

    subgraph PC3["PC 3 — OBS / YouTube"]
        MAIN["/overlay/main"]
        SQUAD["/overlay/team-squad-board"]
        HOOK3["useOverlayRealtime"]
    end

    AUC -->|"POST bid/sell"| REST
    REST --> PUSH --> BROKER

    BROKER -->|"WebSocket primary"| HOOK2
    BROKER -->|"WebSocket primary"| HOOK3

    HOOK2 -->|"HTTP fallback if WS down"| SNAP
    HOOK3 -->|"HTTP fallback if WS down"| SNAP

    HOOK2 --> DISPLAY
    HOOK3 --> MAIN & SQUAD
```

### `useOverlayRealtime` transport strategy

| Mode | When | Latency |
|------|------|---------|
| **WebSocket** | `ws-overlay-native` connected | ~50–300 ms |
| **HTTP poll** | WebSocket failed / stale | ~1.5–3 s |
| **BroadcastChannel** | Same PC only — auction + overlay tabs | Instant (bonus, not relied on for multi-PC) |

### Overlay page map

| Route | Purpose | `includePlayers` |
|-------|---------|------------------|
| `/overlay/main` | Player + bid + team (primary OBS) | No |
| `/overlay/team-budget` | Budget bars | No |
| `/overlay/team-squad` | All teams classic list | Yes |
| `/overlay/team-squad-board` | Rotating premium squad board | Yes |
| `/overlay/ticker` | Scrolling ticker | No |
| `/overlay/sold` / `/unsold` | Verdict full screens | No |
| `/auction-display` | Venue LED + ceremony | Yes (if ceremony on) |
| `/view/{id}` | Public mobile viewer | No (lazy-load tabs) |

---

## 8. Multi-PC event day topology

```mermaid
flowchart LR
    subgraph Venue["Venue network"]
        PC1["PC 1\nAuction operator\n/auction"]
        PC2["PC 2\nLED projector\n/auction-display"]
        PC3["PC 3\nOBS stream PC\nmultiple /overlay/*"]
    end

    subgraph Cloud["Server / VPS"]
        API["API + WebSocket"]
        DB[(MySQL)]
    end

    subgraph Internet["Internet"]
        YT["YouTube Live"]
        PHONES["Audience phones\n/view/{id}"]
    end

    PC1 --> API
    PC2 --> API
    PC3 --> API
  API --> DB
    PC3 --> YT
    PHONES --> API
```

**Important:** PC 1 does **not** push directly to PC 2 or PC 3. All displays subscribe to the **same server feed**. Lag occurs only if WebSocket fails on display PCs (then HTTP polling kicks in).

---

## 9. Player registration flow

```mermaid
sequenceDiagram
    actor Player
    participant Pub as PublicRegistrationPage
    participant API as PlayerRegistrationController
    participant DB as MySQL
    actor Admin
    participant Reg as RegisteredPlayersPage
    participant Import as PlayerService

    Admin->>API: Configure form (Super Admin)
    Admin->>API: Open registration
    Player->>Pub: /register/{tournamentId}
    Pub->>API: GET form schema
    Player->>Pub: Submit form
    Pub->>API: POST registration
    API->>DB: PENDING registration

    Admin->>Reg: Review submissions
    Admin->>API: POST import
    API->>Import: create Player (AVAILABLE)
    Import->>DB: player pool
```

---

## 10. Player import & retained players

```mermaid
flowchart TD
    EXCEL["Excel upload\nPlayers page"] --> POOL["Player pool\nstatus: AVAILABLE"]
    REG["Registration import"] --> POOL
    MANUAL["Add player form"] --> POOL

    RETAINED["Mark retained +\nteam on edit"] --> SQUAD["Team squad\nstatus: SOLD\nbudget deducted"]

    POOL --> START["Start auction"]
    START --> ACTIVE["IN_AUCTION"]
    ACTIVE --> SOLD["SOLD → team"]
    ACTIVE --> UNSOLD["UNSOLD"]
    SOLD --> SQUAD
```

---

## 11. Broadcast control flow

```mermaid
flowchart LR
    BC["BroadcastControlPage"] --> API["PUT broadcast/settings"]
    BC --> RULES["PUT bid-rules"]
    API --> DB[(Tournament flags)]
    RULES --> DB

    DB --> CFG["GET /api/overlay/{id}/config"]
    CFG --> OVL["All overlay pages"]

    BC --> URLS["Copy overlay URLs\ntournamentId + token"]
    URLS --> OBS["OBS browser sources"]
```

### Tournament broadcast flags (stored in DB)

| Flag | Effect |
|------|--------|
| `overlayEnabled` | Master kill switch for all overlay/display updates |
| `overlayShowSquadFormation` | Audience ceremony after SOLD |
| `overlayShowCinematicIntro` | Cinematic intro on audience display |
| `overlayShowBidPop` | Bid amount pulse animation |
| `maxSquadSize` | Squad board / ceremony capacity |
| `overlaySecretToken` | Optional token on overlay URLs |

---

## 12. WhatsApp notification flow (optional)

```mermaid
sequenceDiagram
    participant AP as AuctionPage
    participant API as AuctionController
    participant WA as WhatsAppNotifyService
    participant SP as SoldPlayersPage

    AP->>API: POST /auction/sell
    API->>WA: notifyPlayerSoldAsync (if auto enabled)
    WA-->>SP: status SENT / FAILED / SKIPPED
    SP->>API: POST retry (manual)
```

Requires server environment: `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`.

---

## 13. Export flows (client-side)

These run **entirely in the browser** — no ongoing server load.

| Export | Page | Mechanism |
|--------|------|-----------|
| Squad Board PDF | Teams | `exportTeamSquadBoard()` → print dialog |
| Classic roster PDF | Teams | `exportTeamRosters()` |
| Squad details CSV+PDF | Teams | `exportTeamSquadDetails()` |
| Player list | Players | `playersExport.js` |
| Registrations Excel | Registrations | xlsx download |

---

## 14. Audience display ceremony flow (SOLD)

```mermaid
sequenceDiagram
    participant WS as WebSocket snapshot
    participant AD as AuctionDisplayPage
    participant Gavel as GavelOverlay
    participant Ceremony as SquadFormationCeremony

    WS->>AD: auction.status = SOLD
    AD->>Gavel: show SOLD animation
    Gavel->>AD: onComplete
    alt overlayShowSquadFormation = true
        AD->>Ceremony: beginCeremony(sale)
        Ceremony->>Ceremony: fly animation + roster update
        Ceremony->>AD: onComplete
    end
    AD->>AD: show classic result card
```

Ceremony uses **local roster state** hydrated from team snapshots + append on sell. Does not slow the auction API.

---

## 15. Caching & performance design

| Area | Strategy |
|------|----------|
| Auction sell | Lightweight WS push first; squad push async |
| Overlay snapshots | Lightweight by default; full players only when needed |
| Audit logs | Async executor (`auditLogExecutor`) |
| Overlay push | Async executor (`overlayPushExecutor`) |
| Admin auction poll | 5 s while ACTIVE (AuctionPage) |
| Overlay HTTP fallback | 1.5 s lightweight poll when WS down |
| DB pool | HikariCP (tuned in application.properties) |

---

## 16. Environment variables (reference)

| Variable | Layer | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | Frontend build | API base URL (also derives WebSocket URL) |
| `DB_USERNAME` / `DB_PASSWORD` | Backend | MySQL credentials |
| `SPRING_DATASOURCE_URL` | Backend | JDBC connection |
| `APP_CORS_ALLOWED_ORIGINS` | Backend | Allowed frontend origins |
| `WHATSAPP_API_TOKEN` | Backend | Optional WhatsApp |
| `WHATSAPP_PHONE_NUMBER_ID` | Backend | Optional WhatsApp |

---

## 17. Request path summary (quick reference)

```
Browser action
    → React page / hook
        → Axios (JWT) or WebSocket (public)
            → Spring Controller
                → Service (business rules)
                    → JPA Repository
                        → MySQL
                    → OverlayPushService (async)
                        → STOMP /topic/overlay/{id}/snapshot
                            → All connected overlay clients
```

---

## 18. Related documents

| Document | Contents |
|----------|----------|
| [`docs/USER_MANUAL.md`](USER_MANUAL.md) | End-user guide, tab by tab |
| [`README.md`](../README.md) | Developer quick start |
| [`AGENTS.md`](../AGENTS.md) | Codebase map for developers |

---

*This architecture reflects the codebase as of 2026. Overlay WebSocket transport improvements are tracked in PR #105 (`cursor/overlay-ws-sync-fix-a561`).*
