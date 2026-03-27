# MERN TypeScript Template with Auth0

## Commands

| Command | Description |
|---------|-------------|
| `npm run boot` | First-time setup: prompts for Docker names/ports, copies .env files, installs deps |
| `npm run dev` | Start dev environment with `docker compose watch` (live sync) |
| `npm run dev:detached` | Start dev environment in background |
| `npm run stop` | Stop all containers |
| `npm run logs` | Tail logs from all containers |
| `npm run reset` | Stop containers and delete all volumes |
| `npm run build` | Build Server and Client in parallel |
| `npm run install:all` | Install deps in Server/ and Client/ |
| `npm run test` | Run Vitest in Server and Client |
| `npm run lint` | Run ESLint in Server and Client |
| `npm run docker:ps` | Show running container status |
| `npm run docker:stats` | Show container CPU/memory usage |
| `npm run docker:rebuild` | Clean rebuild: stop, remove volumes, rebuild, start |
| `npm run docker:shell:server` | Open shell in server container |
| `npm run docker:shell:client` | Open shell in client container |
| `npm run docker:logs:server` | Tail server logs only |
| `npm run docker:logs:client` | Tail client logs only |

### Server scripts (run from Server/)
- `npm run dev` — `tsx --watch src/server.ts`
- `npm run build` — `tsc -b && tsc-alias`
- `npm start` — `node dist/server.js`
- `npm run test` — `vitest run`
- `npm run test:watch` — `vitest`
- `npm run lint` — `eslint .`

### Client scripts (run from Client/)
- `npm run dev` — `vite`
- `npm run build` — `tsc -b && vite build`
- `npm run lint` — `eslint .`
- `npm run test` — `vitest run`
- `npm run test:watch` — `vitest`

## Architecture

### Server (Express 5 + TypeScript)

Entry point: `Server/src/server.ts`

Middleware order: cors → rateLimit (10k/15min) → morgan → connectDB → json → urlencoded → routes → errorHandler

Routes:
- `GET /health` — health check (no auth)
- `POST /api/users` — create user (no auth)
- `GET /api/users` — list users (no auth)
- `GET /api/users/:id` — get user (no auth)
- `PATCH /api/users/:id` — update user (no auth)
- `DELETE /api/users/:id` — delete user (no auth)
- `GET /api/auth/me` — get current user by Auth0 sub (auth required)
- `GET /api/auth/validate` — validate JWT token (auth required)
- `GET /danger/db-health` — database status (dev only)

Auth: `express-oauth2-jwt-bearer` validates Auth0 JWTs. Middleware in `Server/src/middleware/auth0Mdw.ts`. Token payload available on `req.auth.payload`.

Error handling: `AppError` class in `Server/src/utils/errorHandler.ts`. `asyncHandler` wraps async controllers. Mongoose and Zod errors auto-transform to `AppError` with proper status codes.

User model (`Server/src/models/userModel.ts`): firstName, lastName, phone?, profilePicture?, auth0Id (unique), email (unique), role (admin|user), timestamps. Static method: `findByAuth0Id()`.

Validation: Zod schemas in `Server/src/zod/usersZod.ts` — `createUserSchema`, `updateUserSchema`.

Path aliases: `@/*` → `src/*` (resolved at build time by `tsc-alias`).

### Client (React 19 + Vite + TypeScript)

Entry point: `Client/src/main.tsx`

Provider stack (outer → inner): Redux Provider → Auth0Provider → QueryClientProvider → AppInitializer → RouterProvider

Auth flow (`Client/src/components/AppInitializer.tsx`):
1. Auth0 loads → `getAccessTokenSilently()` gets token
2. Sets `Authorization: Bearer {token}` on axios defaults
3. Dispatches `fetchUser` thunk → calls `GET /api/auth/me`
4. If 404 → creates user via `POST /api/users` → fetches again

Routing: Centralized in `Client/src/config/routesConfig.tsx`. Each route has path, name, Component, icon, showInSidebar, requireAuth, requiredRole. `convertToRouterRoutes()` transforms to React Router format. `getSidebarMenuItems()` generates sidebar with auth filtering.

State: Redux Toolkit with `user` slice (`Client/src/redux/slices/userSlice.ts`). `fetchUser` async thunk handles create-on-first-login.

API layer: Axios instance in `Client/src/services/api.ts`. In dev uses relative URLs (Vite proxy handles `/api` → `http://server:3000`). Services in `Client/src/services/`.

Components follow Atomic Design: `Atoms/` (Badge, Card, Heading, etc.), `Molecules/` (FeatureCard, Hero, MenuItem, etc.), `Organisms/` (Footer, Sidebar), `ui/` (shadcn components).

Styling: Tailwind CSS v4, class-variance-authority for variants, tailwind-merge for class merging, Framer Motion for animations.

Path aliases: `@/*` → `./src/*` (via vite.config.ts and tsconfig.app.json).

## Docker

Root `docker-compose.yml` uses `include:` to merge `Server/compose.yml` and `Client/compose.yml`.

Both services use `docker compose watch`:
- `sync` action for `src/` changes (instant, no rebuild)
- `rebuild` action for `package.json` / `package-lock.json` changes

Named volumes for `node_modules` (not bind-mounted from host). Shared `mern-network` bridge network. Client proxies to server via Docker DNS (`http://server:3000`).

Dockerfiles are multi-stage: `development` (tsx/vite dev), `build` (tsc compile), `production` (node/nginx).

`npm run boot` lets you customize container names, image names, ports, and network name.

MongoDB is external (Atlas) — not in Docker.

## Environment Variables

### Server/.env
- `PORT` — Express port (default 3000)
- `NODE_ENV` — development | production
- `MONGO_URI` — MongoDB connection string
- `CLIENT_URL` — Frontend URL for CORS
- `AUTH0_DOMAIN` — Auth0 tenant domain
- `AUTH0_AUDIENCE` — Auth0 API identifier

### Client/.env
- `VITE_API_URL` — Backend API URL (optional, uses proxy in dev)
- `VITE_AUTH0_DOMAIN` — Auth0 tenant domain
- `VITE_AUTH0_CLIENT_ID` — Auth0 app client ID
- `VITE_AUTH0_AUDIENCE` — Auth0 API identifier

## MCP Servers

The project includes `.mcp.json` with six MCP servers configured at project scope. These are available automatically when using Claude Code in this repository.

| Server | Package | Purpose |
|--------|---------|---------|
| `playwright` | `@playwright/mcp` | Browser automation and UI testing |
| `context7` | `@upstash/context7-mcp` | Fetches up-to-date library documentation by version |
| `mongodb` | `mongodb-mcp-server` | Direct MongoDB queries, schema inspection, aggregations |
| `github` | `@modelcontextprotocol/server-github` | Repo management, PRs, issues, code search |
| `auth0` | `@auth0/auth0-mcp-server` | Auth0 tenant management, users, apps, logs |
| `eslint` | `@eslint/mcp` | Linting JavaScript/TypeScript through Claude Code |

### Required environment variables for MCP

These must be set in your **shell environment** (not in `Server/.env` — Claude Code resolves `${VAR}` from the OS environment, not from dotenv files):

- `MONGO_URI` — MongoDB connection string (same value as in `Server/.env`)
- `GITHUB_TOKEN` — GitHub Personal Access Token with repo scope

Set these in your shell profile (`~/.bashrc`, `~/.zshrc`, or Windows environment variables).

## Claude Code Hooks

Configured in `.claude/settings.json`. These run automatically during development:

| Trigger | What runs | Script |
|---------|-----------|--------|
| After any `Write`/`Edit` | ESLint on the changed file (auto-detects Client/ vs Server/) | `scripts/hooks/lint.js` |
| After `Write`/`Edit` on `*.test.*` files | Vitest in the relevant directory | `scripts/hooks/test.js` |

## Testing

- **Framework**: Vitest (configured in both Server and Client)
- **Server config**: `Server/vitest.config.ts` — node environment, `@/` path alias
- **Client config**: `Client/vitest.config.ts` — jsdom environment, React Testing Library
- **Client test setup**: `Client/src/test/setup.ts` — imports `@testing-library/jest-dom/vitest`
- **Test file pattern**: `src/**/*.test.ts` (Server), `src/**/*.test.{ts,tsx}` (Client)

## Claude Code Agents

Autonomous agents in `.claude/agents/` that handle multi-step workflows. Unlike commands (interactive, single-step), agents work autonomously across multiple tools and MCP servers.

| Agent | File | Purpose | MCP Servers Used |
|-------|------|---------|-----------------|
| Backend Engineer | `backend-engineer.md` | Senior backend dev — implements, debugs, refactors server code following all project conventions | mongodb, context7, eslint |
| Frontend Engineer | `frontend-engineer.md` | Senior frontend dev — implements, debugs, refactors client code following all project conventions | playwright, context7, eslint |
| Feature Architect | `feature-architect.md` | Designs full-stack feature implementation plans without writing code | context7, mongodb, auth0 |
| E2E Test Writer | `e2e-test-writer.md` | Creates and validates Playwright E2E tests against the running app | playwright |
| PR Review | `pr-review.md` | Reviews GitHub PRs against project conventions, posts structured feedback | github, eslint |
| Issue to Code | `issue-to-code.md` | Reads a GitHub issue → implements feature → opens PR | github, context7, eslint |
| DB Migration | `db-migrate.md` | Compares Mongoose models vs live MongoDB, performs schema migrations | mongodb |
| Auth0 Setup | `auth0-setup.md` | Configures Auth0 tenant (apps, APIs, roles, permissions) | auth0 |
| API Health Audit | `api-health-audit.md` | Proactive audit of API, database, auth config, and docs consistency | mongodb, auth0 |

## Adding New Features

### New API endpoint
1. Controller in `Server/src/controllers/`
2. Zod schema in `Server/src/zod/`
3. Route in `Server/src/routes/` (use `asyncHandler` wrapper, `auth0Middleware` if protected)
4. Register in `Server/src/server.ts`: `app.use("/api/thing", thingRoutes)`

### New page
1. Page component in `Client/src/pages/`
2. Add to `routeConfig` array in `Client/src/config/routesConfig.tsx`
3. API service in `Client/src/services/` if needed
