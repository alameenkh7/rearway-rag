# Resolve RAG Server

Lightweight, custom-built RAG (Retrieval-Augmented Generation) backend + embeddable widget.  
**No Flowise. No vector DB. No TypeScript. Just Node.js.**

> **Note:** This is the original proof-of-concept app (SQLite + flat JSON
> vector files, no auth). It still runs independently and is documented
> below as-is. A production-track rewrite — NestJS, Postgres/pgvector, OTP
> auth, embed-token-protected chat, confidence-gated fallback — lives in
> [`server/`](server/README.md) and has not been cut over yet. See
> [`ARCHITECTURE_AND_IMPLEMENTATION.md`](ARCHITECTURE_AND_IMPLEMENTATION.md)
> for the full design/build reference and [`docs/system-design-mvp.md`](docs/system-design-mvp.md)
> for the original target design.

---

## Requirements

- Node.js ≥ 18
- An OpenAI API key (`text-embedding-3-small` + `gpt-4o-mini`)

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env and set OPENAI_API_KEY

# 3. Start the server
npm start

# Or in development (auto-restart on save)
npm run dev
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP port | `4000` |
| `NODE_ENV` | Environment | `production` |
| `OPENAI_API_KEY` | OpenAI API key | — (required) |
| `WIDGET_HOST_URL` | Public URL of the widget directory | `http://localhost:4000/widget` |

---

## API Reference

### `POST /api/bots/create`

Creates a new chatbot from a PDF and/or description text.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `companyName` | string | ✅ | Bot's company name |
| `email` | string | ✅ | Contact email |
| `businessType` | string | ❌ | e.g. "E-commerce" |
| `description` | string | ❌ | Free-text context (alternative or supplement to PDF) |
| `pdf` | file (.pdf, max 20MB) | ❌ | Knowledge base PDF |

At least one of `pdf` or `description` must be provided.

**Response:**
```json
{
  "success": true,
  "botId": "uuid",
  "companyName": "Acme Corp",
  "chunkCount": 42,
  "widgetSnippet": "<script src=\"...\" data-bot-id=\"uuid\" data-company=\"Acme Corp\" defer></script>",
  "previewUrl": "https://resolve.rearway.com/widget/preview/uuid"
}
```

---

### `POST /api/chat/:botId`

Ask the bot a question.

**Content-Type:** `application/json`

```json
{ "message": "What is your return policy?", "sessionId": "optional-uuid" }
```

**Response:**
```json
{ "answer": "Our return policy...", "sessionId": "uuid" }
```

---

### `GET /api/bots/:botId`

Returns public bot metadata.

```json
{ "botId": "uuid", "companyName": "Acme Corp", "status": "active", "chunkCount": 42 }
```

---

### `GET /widget/widget.js`

Serves the embeddable vanilla JS widget.

### `GET /widget/preview/:botId`

Renders a preview page with the widget loaded — share with customers before they install the snippet.

### `GET /health`

Returns `{ "status": "ok" }` — useful for uptime monitoring.

---

## Widget Installation

After creating a bot, paste the `widgetSnippet` before `</body>` on any page:

```html
<script src="https://resolve.rearway.com/widget/widget.js"
        data-bot-id="YOUR_BOT_ID"
        data-company="Acme Corp"
        defer></script>
```

The widget uses Shadow DOM so it will never conflict with the host page's styles.

---

## Nginx Config

Add these blocks to your `resolve.rearway.com` nginx config:

```nginx
location /api/ {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 25M;
}

location /widget/ {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

---

## Architecture

```
POST /api/bots/create
  → multer (PDF upload)
  → pdf-parse (extract text)
  → chunkText() (split into 500-char overlapping chunks)
  → embedChunks() (OpenAI text-embedding-3-small, batched 100/req)
  → saveVectorStore() (write data/vectors/{botId}.json)
  → insertBot() (write to SQLite)
  → return widgetSnippet + previewUrl

POST /api/chat/:botId
  → findBotById() (SQLite lookup)
  → loadVectorStore() (read {botId}.json)
  → embedQuery() (single embedding for user message)
  → findRelevantChunks() (manual cosine similarity → top 4)
  → gpt-4o-mini chat completion (context-grounded prompt)
  → return answer
```

---

## Design Decisions

- **No vector DB** — JSON files are sufficient for POC-scale. 1MB+ files are fine.
- **Cosine similarity is manual** — `a·b / (|a|×|b|)` loop in `src/rag/search.js`, no external math library.
- **botId = sole access control** — no auth for POC (constraint #9).
- **CORS fully open** — widget runs on arbitrary customer domains (constraint #10).
- **pdf-parse deprecation suppressed** via `{ version: '1.10.100' }` option (constraint #6).
