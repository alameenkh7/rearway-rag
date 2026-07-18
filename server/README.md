# Resolve RAG — Trial API (server/)

NestJS Clean Architecture rewrite of the Resolve RAG backend, built for the
Trial plan ahead of opening it to real paying-adjacent customers. Runs
alongside the original Express app in `../src/` (untouched, not cut over) —
see [`../ARCHITECTURE_AND_IMPLEMENTATION.md`](../ARCHITECTURE_AND_IMPLEMENTATION.md)
for the full architecture reference and [`../docs/system-design-mvp.md`](../docs/system-design-mvp.md)
for the original design.

**Stack:** NestJS · TypeScript · Postgres + pgvector · Sequelize · JWT (OTP-based, passwordless) · Swagger · OpenRouter (`text-embedding-3-small`, `gpt-4o-mini`)

---

## Quickstart

```bash
# 1. Start Postgres (pgvector-enabled, local dev only)
docker compose up -d

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# fill in OPENROUTER_API_KEY at minimum — RESEND_API_KEY can stay blank,
# OTP codes will print to the server console instead of emailing

# 4. Run migrations
npx sequelize-cli db:migrate

# 5. Start the dev server (watch mode)
npm run start:dev
```

Server listens on `http://localhost:4001` by default (`PORT` in `.env`).
Interactive API docs: **http://localhost:4001/api/docs**

---

## Environment variables

| Variable | Description |
|---|---|
| `PORT` | HTTP port (default `4001`) |
| `DATABASE_URL` | Postgres connection string — local dev points at the docker-compose container, production points at Neon (or similar) |
| `OPENROUTER_API_KEY` | Required — used for both embeddings and chat completions |
| `RESEND_API_KEY` | Optional — if blank, OTP codes are logged to the console instead of emailed |
| `EMAIL_FROM` | From-address for OTP emails |
| `AUTH_JWT_SECRET` | Signs verification tokens and session tokens |
| `WIDGET_HOST_URL` | Base URL used to build the `widgetSnippet`/`previewUrl` returned from bot creation |
| `WHITELISTED_IPS` | Comma-separated IPs exempt from rate limiting |
| `DAILY_LIMIT` | Override the default 15-messages/day/IP trial rate limit |

---

## API summary

Full request/response shapes are in Swagger (`/api/docs`) or
`ARCHITECTURE_AND_IMPLEMENTATION.md` §4.4. In order of use:

```
POST /api/v1/auth/otp/request    {email}
POST /api/v1/auth/otp/verify     {email, code}                    → verificationToken
POST /api/v1/bots                multipart: companyName + pdf/websiteUrl/description
                                  (Authorization: Bearer <verificationToken>)
                                  → botId, embedToken, widgetSnippet, previewUrl
GET  /api/v1/bots/:botId
POST /api/v1/bots/:botId/session (X-Embed-Token)                  → sessionToken
POST /api/v1/bots/:botId/chat    {message}
                                  (X-Embed-Token, Authorization: Bearer <sessionToken>)
                                  → {type:"answer"|"fallback", ...}
```

---

## Project structure

Clean Architecture per `../docs/coding_standards.md`:

```
src/
├── core/                # entities, entitygateway (ports), usecases — zero framework deps
├── infrastructure/       # Sequelize persistence, Auth guards/JWT, LLM, Email, Ingestion, Cron
├── gateways/http/        # controllers, DTOs, Swagger setup
├── coreadapter/          # the one place infra gets wired into core's Deps
├── codecs/               # shared string-literal enums
└── shared/               # BaseError + domain errors, cross-cutting decorators
```

---

## Nightly purge job

Trial bots older than 15 days are hard-deleted (bot, sessions, messages,
chunks — via `ON DELETE CASCADE`) by a `@nestjs/schedule` cron running at
3am server time (`infrastructure/Cron/purge-cron.service.ts`). The
`retention_leads` table is never touched by this job — see
`ARCHITECTURE_AND_IMPLEMENTATION.md` for why.

---

## What's not built yet

Instant plan (dashboard, WhatsApp handoff), Business plan (custom API
integrations), and an automated test suite — see
`ARCHITECTURE_AND_IMPLEMENTATION.md` §5 for the full list of known
limitations and next steps.
