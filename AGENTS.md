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
