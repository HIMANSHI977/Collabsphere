# CollabSphere

CollabSphere is an AI-assisted developer collaboration platform built with the MERN stack. It combines project ownership and membership, tasks, Markdown notes, managed project files, Gemini-powered assistance, contribution analytics, activity history, and revocable public project overviews.

## Features

- JWT registration, login, restored sessions, protected routes, and logout
- Owner/member project access, membership management, project CRUD, and cascade cleanup
- Project task boards with To Do, In Progress, and Completed states, priority, due dates, search, and filters
- Project Markdown note CRUD, preview, Gemini explanation, and improvement suggestions
- Controlled project uploads for images and text/code with secure member-only preview, download, and deletion
- Gemini code explanation, developer documentation generation, and README generation
- MongoDB-backed activity events and contribution summaries
- Unique revocable public read-only project pages with explicitly published README content
- Responsive React interface using the CollabSphere purple/lavender theme

## Technology

- React, Vite, JavaScript ES modules, CSS, React Router, and React Markdown
- Node.js ES modules, Express, Mongoose, Multer
- MongoDB Atlas (or another MongoDB deployment supporting the configured operations)
- bcrypt password hashing and jsonwebtoken
- Google Gemini API through a server-only backend integration

## Prerequisites

- Node.js 20.19+ or 22.12+ and npm (Vite 8 requirement)
- MongoDB Atlas or a development MongoDB database
- Google AI Studio Gemini API key for AI actions

## Installation and Configuration

From the repository root:

```sh
npm install
npm install --prefix server
npm install --prefix client
```

Create `server/.env` from `server/.env.example`. Set a real MongoDB URI, a cryptographically random JWT secret of at least 32 characters, and a Gemini API key. Do not copy real secrets into source control or the client environment. Create `client/.env` from `client/.env.example` only when changing the local proxy/API URL. Existing `.env` files are local and must not be overwritten without confirming their target.

### Environment variables

Server (`server/.env`):

| Name | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | Express listen port; defaults to 3000 |
| `MONGODB_URI` | Yes | Connection URI for the application database |
| `JWT_SECRET` | Yes | Random signing secret, minimum 32 characters |
| `GEMINI_API_KEY` | For AI | Google Gemini API key; server-side only |
| `GEMINI_MODEL` | No | Gemini model name; defaults to `gemini-2.5-flash` |
| `CLIENT_URL` | For production | Primary frontend origin allowed by CORS |
| `FRONTEND_ORIGINS` | No | Comma-separated list of allowed frontend origins |

Client (`client/.env`):

| Name | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | No | API base URL; defaults to same-origin `/api` |
| `VITE_DEV_API_PROXY` | No | Vite development proxy target; defaults to `http://localhost:3000` |

Only public settings belong in `VITE_` variables. Never add the Mongo URI, JWT secret, Gemini key, or credentials to client variables.

## Run Locally

Start both processes at the repository root:

```sh
npm run dev
```

Or use two terminals:

```sh
npm run dev --prefix server
npm run dev --prefix client
```

The API defaults to `http://localhost:3000`; Vite defaults to `http://localhost:5173` and proxies `/api` to the backend. If port 5173 is occupied, Vite automatically chooses another port. The server startup validates the required JWT and database configuration before listening.

## API Overview

All endpoints use the `/api` prefix. Protected routes require `Authorization: Bearer <token>`.

| Method | Path | Purpose | Access |
| --- | --- | --- | --- |
| `GET` | `/health` | API health check | Public |
| `POST` | `/auth/register` | Register and return JWT | Public |
| `POST` | `/auth/login` | Login and return JWT | Public |
| `GET` | `/auth/me` | Restore authenticated user | Authenticated |
| `GET`, `POST` | `/projects` | List owned/shared projects; create project | Authenticated |
| `GET`, `PUT`, `DELETE` | `/projects/:id` | View, update, delete project | Member for view; owner for update/delete |
| `POST` | `/projects/:id/members` | Add registered user by email | Owner |
| `DELETE` | `/projects/:id/members/:memberId` | Remove a project member | Owner |
| `PATCH` | `/projects/:id/sharing` | Enable/revoke public page and set public README | Owner |
| `GET`, `POST` | `/tasks?projectId=:id`, `/tasks` | List/create tasks | Project member |
| `PUT`, `DELETE` | `/tasks/:id` | Update/delete task | Project member |
| `GET`, `POST` | `/notes?projectId=:id`, `/notes` | List/create Markdown notes | Project member |
| `GET`, `PUT`, `DELETE` | `/notes/:id` | Read/update/delete note | Project member |
| `GET`, `POST` | `/files?projectId=:id`, `/files` | List/upload file | Project member |
| `GET` | `/files/:id/content` | Text/code preview (`?ai=true` enforces AI input bound) | Project member |
| `GET`, `DELETE` | `/files/:id` | Secure download or delete | Project member |
| `POST` | `/gemini/explain` | Explain note/code or suggest note improvements | Authenticated |
| `POST` | `/gemini/docs` | Generate developer documentation from code | Authenticated |
| `POST` | `/gemini/readme` | Generate a project README draft | Authenticated |
| `GET` | `/analytics/project?projectId=:id` | Real project contribution counts and activity | Project member |
| `GET` | `/public/projects/:shareId` | Explicitly public, read-only overview | Public |

The project task board filters text client-side by title and description and supports status/priority filters. Public API output excludes notes, files, tasks, member details, and credentials.

## Files and Storage

Uploads are stored with random generated storage names under `server/uploads`; original filenames are sanitized and storage names are never included in client API responses. The allowlist supports common raster images and text/code formats, with a 5 MB limit. Image signatures and UTF-8 text are validated. Text previews are limited to 200 KB; AI code input is limited to 20,000 characters. Download and preview endpoints require project membership.

Local disk is suitable for development and persistent-disk hosts. Many serverless/container hosts use ephemeral filesystems; production on those hosts requires a persistent mounted volume or a configured object-storage adapter before uploads can be considered durable. Back up uploaded files separately from MongoDB.

## Gemini Setup

Create an API key in Google AI Studio and set `GEMINI_API_KEY` in the backend host's secret manager or `server/.env`. Set `GEMINI_MODEL` if using a different model available to the account. Gemini requests are made only by the backend. Missing configuration, provider errors, timeouts, and rate limits return errors; the application does not substitute fabricated output. Do not send arbitrary uploaded files to Gemini: only allowlisted text/code can be read for AI, with a 20,000-character bound.

## Tests and Checks

```sh
npm test
npm run lint
npm run build

# Or run the individual package scripts:
npm test --prefix server
npm run lint --prefix client
npm run build --prefix client
```

The Node test suite uses mocked Mongoose operations and in-process HTTP checks. It does not connect to MongoDB Atlas or call Gemini. For live integration testing, create a dedicated non-production test database and test credentials; never run destructive tests against production. Browser UI can be started with the local commands above, then test registration, membership, project tools, file operations, AI actions, and public-share revocation against the isolated backend.

## Deployment

1. Create a dedicated Atlas database and restricted application user. Configure Atlas network access for the backend host's outbound IP ranges. Avoid open network access except as a short-lived, deliberate development measure.
2. Deploy the server to a persistent Node host. Build/install from `server`, set `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, optional `GEMINI_MODEL`, `PORT`, and exact `CLIENT_URL`/`FRONTEND_ORIGINS`; start with `npm start`. The health check is `/api/health`.
3. Ensure the host provides persistent disk mounted at `server/uploads`, or replace local disk storage with object storage before relying on uploads. Ephemeral disk contents can disappear on redeploy/restart.
4. Deploy the Vite client as static assets. Set `VITE_API_URL` at build time to the backend URL plus `/api` (for example `https://api.example.com/api`) or route `/api` through a same-origin reverse proxy. Rebuild after changing it.
5. Configure the static host's SPA rewrite so `/projects/:id/...` and `/share/:shareId` return `index.html`. Ensure API requests are proxied to Express rather than the SPA fallback.
6. Use HTTPS for both sites, configure exact CORS origins, keep secrets in the host secret manager, and run the test/lint/build commands in CI before release.

No Atlas connection, Gemini provider call, production host, or live deployment has been verified in this workspace.

## Security Notes

- Passwords use bcrypt; password fields are excluded from ordinary user queries.
- JWTs expire after one day. Browser logout removes the token; invalid/expired-token responses also clear it. There is no server-side token revocation list.
- Owners manage membership and public sharing. Members may use project tasks, notes, files, and analytics; removing membership revokes project access.
- Public share IDs are random and revocable. Only project overview and owner-published README content are public.
- Error responses do not return stack traces. Uploads and AI actions enforce allowlists and size limits. Use HTTPS, a strong JWT secret, narrow CORS origins, and server-only credentials in production.
