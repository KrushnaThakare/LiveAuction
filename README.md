# Cricket Auction Web Application

A full-stack cricket player auction management system built with React (Vite) + Spring Boot.

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS, Axios |
| Backend   | Spring Boot 3.2, Java 17            |
| Database  | MySQL 8.0                           |
| Parsing   | Apache POI (Excel upload)           |
| Deploy    | Docker Compose                      |

---

## Features

### Tournament System
- Create and manage multiple independent tournaments
- Each tournament has its own players, teams, and auction lifecycle

### Player Module
- Upload players via `.xlsx` / `.xls` Excel file
- **Excel format:** `Name | Role | Base Price | Image URL`
  - Roles: `BATSMAN`, `BOWLER`, `ALL_ROUNDER`, `WICKET_KEEPER`
- Google Drive share links are automatically converted to direct image URLs
- Filter players by role and status (Available, In Auction, Sold, Unsold)

### Team Module
- Create teams with name, logo URL, and starting budget
- Live remaining budget tracking
- Expand teams to view purchased players

### Auction Engine
- Start auction for any available player
- Teams place bids with auto-calculated increments:
  - If current bid < ₹10,000 → **+₹1,000**
  - If current bid ≥ ₹10,000 → **+₹2,000**
- Sell player to highest bidder — budget deducted automatically
- Mark player as Unsold — player can be re-auctioned later
- Live bid highlight with glow effect on current highest bidder

### UI Pages
| Page        | Route       | Description                         |
|-------------|-------------|-------------------------------------|
| Home        | `/`         | Tournament management dashboard     |
| Players     | `/players`  | Upload, browse, and filter players  |
| Auction     | `/auction`  | Live auction screen                 |
| Teams       | `/teams`    | Team creation and budget overview   |
| Sold        | `/sold`     | Table of sold players with prices   |
| Unsold      | `/unsold`   | Unsold players with re-auction      |

### Bonus Features
- **Voice Announcements** — Browser Speech API announces bids, sales, and unsold calls
- **Fullscreen Mode** — Toggle fullscreen on the auction screen
- **Theme System** — 5 built-in themes switchable at runtime:
  - Midnight Blue (default)
  - Emerald Night
  - Royal Gold
  - Crimson Fire
  - Ocean Breeze

---

## Project Structure

```
cricket-auction/
├── backend/
│   ├── src/main/java/com/cricketauction/
│   │   ├── config/          # CORS configuration
│   │   ├── controller/      # REST controllers
│   │   ├── dto/             # Request/Response DTOs
│   │   ├── entity/          # JPA entities
│   │   ├── exception/       # Global exception handling
│   │   ├── repository/      # Spring Data JPA repositories
│   │   ├── service/         # Business logic
│   │   └── util/            # Excel parser, Google Drive util
│   └── src/main/resources/
│       └── application.properties
│
├── frontend/
│   └── src/
│       ├── api/             # Axios API clients
│       ├── components/
│       │   ├── common/      # Navbar, Modal, Spinner, EmptyState
│       │   ├── auction/     # Auction-specific components
│       │   ├── players/     # PlayerCard
│       │   ├── teams/       # TeamForm
│       │   └── tournaments/ # TournamentForm
│       ├── contexts/        # ThemeContext, TournamentContext
│       ├── pages/           # Page-level components
│       ├── styles/          # Theme CSS variables
│       └── utils/           # Formatters, voice announcement
│
└── docker-compose.yml
```

---

## Quick Start

### Prerequisites
- Java 17+
- Node.js 20+
- MySQL 8.0 (or Docker)

### Option 1: Docker Compose (Recommended)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api

### Option 2: Manual Setup

**Backend:**
```bash
cd backend

# Configure MySQL in application.properties or via env vars:
export DB_USERNAME=root
export DB_PASSWORD=yourpassword

mvn spring-boot:run
```

**Frontend:**
```bash
cd frontend
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:8080/api
npm install
npm run dev
```

---

## API Reference

### Tournaments
| Method | Endpoint                | Description          |
|--------|-------------------------|----------------------|
| GET    | `/api/tournaments`      | List all tournaments |
| POST   | `/api/tournaments`      | Create tournament    |
| GET    | `/api/tournaments/{id}` | Get tournament       |
| PUT    | `/api/tournaments/{id}` | Update tournament    |
| DELETE | `/api/tournaments/{id}` | Delete tournament    |

### Players
| Method | Endpoint                                        | Description              |
|--------|--------------------------------------------------|--------------------------|
| POST   | `/api/tournaments/{id}/players/upload`          | Upload Excel file        |
| GET    | `/api/tournaments/{id}/players?status=SOLD`     | Get players (filterable) |
| DELETE | `/api/tournaments/{id}/players/{playerId}`      | Delete player            |

### Teams
| Method | Endpoint                                    | Description    |
|--------|----------------------------------------------|----------------|
| POST   | `/api/tournaments/{id}/teams`               | Create team    |
| GET    | `/api/tournaments/{id}/teams`               | List teams     |
| PUT    | `/api/tournaments/{id}/teams/{teamId}`      | Update team    |
| DELETE | `/api/tournaments/{id}/teams/{teamId}`      | Delete team    |

### Auction
| Method | Endpoint                                            | Description          |
|--------|------------------------------------------------------|----------------------|
| GET    | `/api/tournaments/{id}/auction/state`               | Current auction state|
| POST   | `/api/tournaments/{id}/auction/start/{playerId}`    | Start auction        |
| POST   | `/api/tournaments/{id}/auction/bid`                 | Place bid `{teamId}` |
| POST   | `/api/tournaments/{id}/auction/sell`                | Sell to highest bidder|
| POST   | `/api/tournaments/{id}/auction/unsold`              | Mark as unsold       |

---

## Excel Upload Format

Row 1 is the header row (skipped automatically).

| Column A | Column B   | Column C      | Column D                        |
|----------|------------|---------------|---------------------------------|
| Name     | Role       | Base Price    | Image URL (optional)            |
| Virat K  | BATSMAN    | 5000          | https://drive.google.com/...    |
| Bumrah   | BOWLER     | 8000          |                                 |
| Jadeja   | ALL_ROUNDER| 4000          |                                 |
| Dhoni    | WICKET_KEEPER | 10000     |                                 |

Google Drive links in any of these formats are auto-converted:
- `https://drive.google.com/file/d/{id}/view`
- `https://drive.google.com/open?id={id}`
- `https://drive.google.com/uc?id={id}`
