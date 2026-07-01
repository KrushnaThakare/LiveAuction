# Agent Guide

Use this file as the first-stop map for AI work in this repository. Keep prompts and edits scoped to the relevant layer unless the task clearly needs full-stack changes.

## Project shape

- Full-stack cricket auction platform.
- `frontend/`: React 19, Vite 8, Tailwind CSS, React Router, Axios.
- `backend/`: Spring Boot 3.2, Java 17, Spring Data JPA, Spring Security/JWT, MySQL.
- Local full stack: `docker-compose up --build`.

## Key paths

- Frontend entry/routing: `frontend/src/main.jsx`, `frontend/src/App.jsx`.
- Frontend API clients: `frontend/src/api/`.
- Frontend auth/tournament state: `frontend/src/contexts/`.
- Auction UI: `frontend/src/pages/AuctionPage.jsx`.
- Public/broadcast overlays: `frontend/src/pages/Overlay*.jsx`, `frontend/src/hooks/useOverlayRealtime.js`.
- Backend entry: `backend/src/main/java/com/cricketauction/CricketAuctionApplication.java`.
- Backend controllers: `backend/src/main/java/com/cricketauction/controller/`.
- Backend services: `backend/src/main/java/com/cricketauction/service/`.
- Core auction logic: `backend/src/main/java/com/cricketauction/service/AuctionService.java`.
- Auth/security rules: `backend/src/main/java/com/cricketauction/config/SecurityConfig.java`.
- Runtime config: `backend/src/main/resources/application.properties`.

## Commands

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Backend:

```bash
cd backend
mvn test
mvn clean package
```

## Conventions

- Match existing Java, JSX, and Tailwind patterns. Do not introduce TypeScript unless asked.
- Keep controller code thin; put business rules in services.
- Tournament-scoped data should stay scoped by `tournamentId` across backend queries and frontend API calls.
- Public overlay/registration/view routes are intentional; review `SecurityConfig.java` before changing access rules.
- Avoid broad refactors while fixing bugs. Touch the smallest set of files that safely resolves the issue.
- If dependency lockfiles are relevant, read them explicitly; they are ignored from Cursor indexing to reduce token noise.

## Best context targets

- Auction behavior: `AuctionService.java`, `AuctionController.java`, `frontend/src/api/auction.js`, `AuctionPage.jsx`.
- Overlay behavior: `OverlayPushService.java`, `OverlayController.java`, `useOverlayRealtime.js`, one matching overlay page.
- Auth/users: `SecurityConfig.java`, `JwtFilter.java`, `AuthController.java`, `AuthContext.jsx`.
- Registration: registration controllers/services plus `RegistrationSettingsPage.jsx`, `PublicRegistrationPage.jsx`, `RegisteredPlayersPage.jsx`.

## Cursor Cloud specific instructions

The dependency-refresh startup script installs frontend npm deps and warms the Maven cache. Everything below is manual/service-level and is NOT run automatically.

- Run services manually (do not use Docker here; run the three services directly in dev mode):
  - MySQL: `sudo service mysql start` (must be started every session; it is not auto-started). Root is configured as `root`/`root` and the `cricket_auction` DB exists. The MySQL CLI over the unix socket fails with a permission error under this user; connect over TCP instead: `mysql -uroot -proot -h127.0.0.1`.
  - Backend: `cd backend && mvn spring-boot:run` (port 8080, API base `/api`). It needs MySQL up first; it auto-creates the schema (`ddl-auto=update`) and seeds a super-admin `admin`/`admin123` on startup.
  - Frontend: `cd frontend && npm run dev` (Vite dev server on port 5173, proxies to `http://localhost:8080/api` via `VITE_API_URL`). CORS already allows `localhost:5173`.
- Log in at `http://localhost:5173` with `admin`/`admin123` to reach the tournament dashboard.
- Lint/test/build commands are in the `## Commands` section above. Note: `npm run lint` currently reports pre-existing errors in the repo (e.g. `UsersPage.jsx`); this is the repo's existing state, not an environment problem. `npm run build` and backend `mvn test` (H2-backed) pass.
- Optional services (`cricheroes-worker`, Cloudinary, Google Sheets webhook) degrade gracefully when their env vars are unset and are not needed for core auction flows.
