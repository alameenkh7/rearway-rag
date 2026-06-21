# BUILD TASK: Resolve Lightweight RAG Backend + Widget
## Custom-built, no Flowise, full code ownership

---

## WHY NO FLOWISE

Flowise requires 2GB+ RAM, a complex UI, and abstracts away code you need to own.
This custom build does the same thing in ~400 lines of Node.js, uses ~150MB RAM, and every line is yours.

---

## WHAT THIS BUILDS

```
Customer uploads PDF or fills form
           ↓
Our Node.js server:
  1. Extracts text from PDF
  2. Splits into chunks
  3. Gets embeddings from OpenAI API
  4. Saves chunks + embeddings as a JSON file (one per bot)
           ↓
Customer gets a <script> tag
           ↓
Vanilla JS widget on their website
  → User types question
  → We embed the question
  → Cosine similarity finds top 4 relevant chunks
  → GPT-4o-mini generates answer using those chunks
  → Answer shown in chat widget
```

---

## TECH STACK

| What | Package | Why |
|------|---------|-----|
| Server | express | Simple HTTP server |
| PDF parsing | pdf-parse | Extracts text from PDF buffer |
| Web Scraping | axios + cheerio | Crawl websites and extract clean text |
| OpenRouter | openai | Embeddings + chat completions (via OpenRouter API) |
| Bot metadata | better-sqlite3 | Stores company name, email, bot config, trial limits |
| Vector data | Plain JSON files | One file per bot in /data/vectors/ |
| File upload | multer | PDF upload |
| IDs | uuid | Generate bot IDs |
| CORS | cors | Cross-origin for widget |

**No vector database. No Pinecone. No Postgres. No Redis. Just JSON files.**

---

## FOLDER STRUCTURE

```
resolve-rag-server/
├── src/
│   ├── server.js           # Express app + startup
│   ├── routes/
│   │   ├── bots.js         # POST /api/bots/create
│   │   └── chat.js         # POST /api/chat/:botId
│   ├── rag/
│   │   ├── extract.js      # PDF text extraction
│   │   ├── scrape.js       # Website crawler & HTML text extraction
│   │   ├── chunk.js        # Text chunking
│   │   ├── embed.js        # OpenRouter embeddings
│   │   ├── search.js       # Cosine similarity search
│   │   └── vectorStore.js  # Read/write JSON vector files
│   ├── db/
│   │   ├── database.js     # SQLite init
│   │   └── bots.js         # Bot CRUD + Token usage tracking
│   └── middleware/
│       └── upload.js       # Multer config
├── public/
│   └── widget.js           # Embeddable vanilla JS widget
├── data/
│   ├── resolve.db          # SQLite file (gitignored)
│   └── vectors/            # {botId}.json files (gitignored)
├── uploads/                # Temp PDF storage (gitignored)
├── .env.example
├── package.json
└── README.md
```

---

## ENVIRONMENT VARIABLES

```env
PORT=4000
NODE_ENV=production
OPENROUTER_API_KEY=sk-or-v1-...
WIDGET_HOST_URL=https://resolve.rearway.com/widget
```

---

## DATABASE — SQLite

One table in `data/resolve.db`:

```sql
CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  business_type TEXT,
  email TEXT NOT NULL,
  description TEXT,
  website_url TEXT,
  chunk_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active',
  plan TEXT DEFAULT 'trial',
  expires_at DATETIME,
  token_usage INTEGER DEFAULT 0,
  token_limit INTEGER DEFAULT 50000
);
```

---

## RAG PIPELINE — 5 FILES

### `src/rag/extract.js`

```javascript
const pdfParse = require('pdf-parse')

// Input: Buffer (PDF file bytes)
// Output: string (all extracted text)
async function extractTextFromPdf(buffer) {
  const data = await pdfParse(buffer)
  return data.text
}

module.exports = { extractTextFromPdf }
```

---

### `src/rag/chunk.js`

Split text into overlapping chunks. No library needed — pure string logic.

```javascript
// Input: string (full text), options { chunkSize: 500, overlap: 50 }
// Output: string[] (array of text chunks)
function chunkText(text, options = {}) {
  const chunkSize = options.chunkSize || 500
  const overlap = options.overlap || 50

  // 1. Clean the text: collapse multiple newlines, trim whitespace
  // 2. Split into sentences by period/newline
  // 3. Accumulate sentences into chunks until chunkSize characters reached
  // 4. Start next chunk with last `overlap` characters of previous chunk
  // 5. Return array of chunks, filter out any chunk shorter than 50 chars

  const cleaned = text.replace(/\s+/g, ' ').trim()
  const chunks = []
  let start = 0

  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length)
    chunks.push(cleaned.slice(start, end).trim())
    start += chunkSize - overlap
  }

  return chunks.filter(c => c.length > 50)
}

module.exports = { chunkText }
```

---

### `src/rag/embed.js`

```javascript
const OpenAI = require('openai')
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const EMBED_MODEL = 'text-embedding-3-small'
const BATCH_SIZE = 100  // OpenAI allows up to 2048 inputs per request

// Input: string[] (chunks)
// Output: number[][] (embedding vectors, same order as input)
async function embedChunks(chunks) {
  const embeddings = []

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const response = await client.embeddings.create({
      model: EMBED_MODEL,
      input: batch,
    })
    embeddings.push(...response.data.map(d => d.embedding))
  }

  return embeddings
}

// Input: single string (query)
// Output: number[] (single embedding vector)
async function embedQuery(query) {
  const response = await client.embeddings.create({
    model: EMBED_MODEL,
    input: [query],
  })
  return response.data[0].embedding
}

module.exports = { embedChunks, embedQuery }
```

---

### `src/rag/search.js`

Pure math. No library.

```javascript
// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

// Input: queryEmbedding (number[]), vectorStore ({chunks: [{text, embedding}]}), topK
// Output: string[] — top K most relevant chunk texts
function findRelevantChunks(queryEmbedding, vectorStore, topK = 4) {
  const scored = vectorStore.chunks.map(chunk => ({
    text: chunk.text,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }))

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, topK).map(s => s.text)
}

module.exports = { findRelevantChunks }
```

---

### `src/rag/vectorStore.js`

```javascript
const fs = require('fs')
const path = require('path')

const VECTOR_DIR = path.join(__dirname, '../../data/vectors')

// Ensure directory exists
fs.mkdirSync(VECTOR_DIR, { recursive: true })

// Save vector store for a bot
// Input: botId (string), chunks (string[]), embeddings (number[][])
function saveVectorStore(botId, chunks, embeddings) {
  const data = {
    botId,
    createdAt: new Date().toISOString(),
    chunks: chunks.map((text, i) => ({ text, embedding: embeddings[i] }))
  }
  fs.writeFileSync(
    path.join(VECTOR_DIR, `${botId}.json`),
    JSON.stringify(data)
  )
}

// Load vector store for a bot
// Returns: { botId, chunks: [{text, embedding}] } or null if not found
function loadVectorStore(botId) {
  const filePath = path.join(VECTOR_DIR, `${botId}.json`)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

module.exports = { saveVectorStore, loadVectorStore }
```

---

## API ENDPOINTS

### `POST /api/bots/create`

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| companyName | string | ✅ | Used for widget header |
| email | string | ✅ | Contact email |
| websiteUrl | string | ⭐️ | Scrape homepage + 10 links |
| description | string | ⭐️ | Free-text context |
| pdf | file (PDF) | ⭐️ | Max 20MB |
| businessType | string | ❌ | Industry category |
| plan | string | ❌ | `"trial"` (default) or `"paid"` |

> *Note: At least one text source (websiteUrl, description, or pdf) must be provided.*

**Logic in exact order:**

```
1. Validate: companyName and email required → 400 if missing
2. Generate botId = uuid()
3. Collect text sources:
   a. If PDF uploaded: extractTextFromPdf(buffer)
   b. If websiteUrl: scrapeWebsite(url) -> extracts text + crawls internal links
   c. If description provided: append to text
   d. If all empty → return 400 "Please provide a PDF, website URL, or description"

4. Chunk the combined text: chunkText(textContent) → chunks[]
5. Get embeddings via OpenRouter: embedChunks(chunks) → embeddings[]
6. Save vector store: saveVectorStore(botId, chunks, embeddings)
7. Save to SQLite: INSERT INTO bots (..., plan='trial', token_limit=50000, expires_at=now+30d)
8. Delete temp upload file

9. Return:
{
  "success": true,
  "botId": "uuid",
  "companyName": "Acme Corp",
  "plan": "trial",
  "chunkCount": 42,
  "pagesScraped": 3,
  "widgetSnippet": "<script src=\"...\">",
  "previewUrl": "https://resolve.rearway.com/widget/preview/uuid"
}
```

---

### `POST /api/chat/:botId`

**Request:** `application/json`
```json
{ "message": "What is your return policy?", "sessionId": "optional-uuid" }
```

**Logic:**

```
1. Load bot from SQLite → 404 if not found
2. Trial Gates:
   a. If plan == 'trial' && expires_at is past → return 402 "trial_expired"
   b. If plan == 'trial' && token_usage >= token_limit → return 402 "token_limit_reached"
3. Load vector store: loadVectorStore(botId) → 404 if not found
4. Embed the user message: embedQuery(message) → queryVector
5. Find relevant chunks: findRelevantChunks(queryVector, vectorStore, 4) → context[]
6. Build prompt:
   system: "You are a helpful assistant for {companyName}. Answer based ONLY on the context provided."
   user: "Context:\n{context.join('\n---\n')}\n\nQuestion: {message}"

7. Call OpenRouter chat completion (model: "openai/gpt-4o-mini")
8. If plan == 'trial', track tokens: token_usage += completion.usage.total_tokens
9. Return:
{ "answer": "response text", "sessionId": "uuid" }
```

---

### `GET /api/bots/:botId`

Returns bot metadata (public). Includes trial token usage info for trial bots.
```json
{ 
  "botId": "uuid", 
  "companyName": "Acme Corp", 
  "status": "active",
  "plan": "trial",
  "expiresAt": "2026-07-21T12:00:00.000Z",
  "tokenUsage": 1250,
  "tokenLimit": 50000,
  "tokensRemaining": 48750
}
```

### `GET /widget/widget.js`

Serves `public/widget.js` with `Content-Type: application/javascript`.

### `GET /widget/preview/:botId`

Returns a full HTML page with the widget loaded on a white background for customer preview.

---

## THE WIDGET — `public/widget.js`

Identical spec to the previous document. Key points:

- IIFE pattern: `(function() { ... })()`
- Reads `data-bot-id` and `data-company` from its own script tag
- Shadow DOM for CSS isolation
- Floating bubble: bottom-right, 56px circle, blue-purple gradient
- Chat panel: 370×520px, slides up on open
- Calls `POST /api/chat/{botId}` (NOT Flowise — our own endpoint)
- Shows typing indicator while waiting
- Welcome message hardcoded (no API call): *"Hi! I'm {companyName}'s assistant. Ask me anything!"*
- Generate random sessionId on load, send with every message
- All CSS inside Shadow DOM — zero bleed to host page
- Works on mobile (< 480px viewport: full width minus 32px padding)

Widget snippet format:
```html
<script src="https://resolve.rearway.com/widget/widget.js"
        data-bot-id="UUID"
        data-company="Acme Corp"
        defer>
</script>
```

---

## PACKAGE.JSON

```json
{
  "name": "resolve-rag-server",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "better-sqlite3": "^9.4.3",
    "openai": "^4.47.0",
    "pdf-parse": "^1.1.1",
    "uuid": "^9.0.0",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

**Total dependencies: 7. No Flowise. No vector DB. No heavy framework.**

---

## SERVER STARTUP — `src/server.js`

```javascript
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const path = require('path')
const { initDatabase } = require('./db/database')
const botsRouter = require('./routes/bots')
const chatRouter = require('./routes/chat')
const fs = require('fs')

// Ensure required directories exist
fs.mkdirSync('./uploads', { recursive: true })
fs.mkdirSync('./data/vectors', { recursive: true })

const app = express()

app.use(cors())
app.use(express.json())
app.use('/widget', express.static(path.join(__dirname, '../public')))

app.use('/api/bots', botsRouter)
app.use('/api/chat', chatRouter)

// Preview page
app.get('/widget/preview/:botId', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head><title>Resolve Chatbot Preview</title></head>
<body style="margin:0;background:#f8fafc;min-height:100vh;">
  <div style="text-align:center;padding:40px;font-family:sans-serif;color:#64748b;">
    Your Resolve chatbot is ready. It will appear in the bottom-right corner.
  </div>
  <script src="/widget/widget.js"
          data-bot-id="${req.params.botId}"
          data-company="Your Business"
          defer></script>
</body>
</html>`)
})

initDatabase()

const PORT = process.env.PORT || 4000
app.listen(PORT, () => console.log(`Resolve RAG server running on port ${PORT}`))
```

---

## NGINX CONFIG TO ADD

Add these location blocks to the existing `resolve.rearway.com` nginx config:

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

## CONSTRAINTS FOR AI AGENT

1. CommonJS only — `require()` not `import`
2. No TypeScript
3. No external vector DB — JSON files only
4. No React — widget is pure vanilla JS
5. The cosine similarity function must be implemented manually (no library)
6. pdf-parse may print deprecation warnings — suppress with `{ version: '1.10.100' }` in options
7. OpenAI embeddings for `text-embedding-3-small` return 1536-dimension vectors
8. The vector JSON files can be large (1MB+ for big PDFs) — that is fine for POC
9. Do not add authentication — bot_id is the only access control for POC
10. The `/api/chat` endpoint must work from any origin (CORS open) since the widget runs on customer websites

---

## WHAT THIS REPLACES

| Flowise | This build |
|---------|-----------|
| 2GB+ RAM | ~150MB RAM |
| 50+ npm packages | 7 npm packages |
| Admin UI you don't need | Zero UI — just API |
| Their code you can't control | Your code, every line |
| Template chatflows to manage | Zero config — just run |
| Breaks when they update | Never breaks unexpectedly |

