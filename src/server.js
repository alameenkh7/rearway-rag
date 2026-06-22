require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')

const { initDatabase } = require('./db/database')
const botsRouter = require('./routes/bots')
const chatRouter = require('./routes/chat')

// Ensure required directories exist before anything else
fs.mkdirSync('./uploads', { recursive: true })
fs.mkdirSync('./data/vectors', { recursive: true })

const app = express()

// Constraint #10: CORS fully open so the widget can call /api/chat from any customer domain
app.use(cors())
app.use(express.json())

// Simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`)
  next()
})


// Serve the public/ directory under /widget (widget.js + static assets)
app.use('/widget', express.static(path.join(__dirname, '../public')))

// API routes
app.use('/api/bots', botsRouter)
app.use('/api/chat', chatRouter)

// Preview page — renders a bare HTML page with the widget loaded
// Useful for sharing with customers before they install the snippet
app.get('/widget/preview/:botId', (req, res) => {
  const { botId } = req.params
  const widgetHostUrl = process.env.WIDGET_HOST_URL || `http://localhost:${process.env.PORT || 4000}/widget`

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Resolve Chatbot Preview</title>
  <style>
    body {
      margin: 0;
      background: #f8fafc;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .preview-banner {
      text-align: center;
      padding: 40px 24px;
      color: #64748b;
    }
    .preview-banner h1 {
      font-size: 1.5rem;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .preview-banner p {
      margin: 0;
      font-size: 0.95rem;
    }
    .bot-id {
      display: inline-block;
      margin-top: 12px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 12px;
      font-family: monospace;
      font-size: 0.85rem;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="preview-banner">
    <h1>Your Resolve chatbot is ready.</h1>
    <p>It will appear in the bottom-right corner of this page.</p>
    <span class="bot-id">Bot ID: ${botId}</span>
  </div>
  <script src="${widgetHostUrl}/widget.js"
          data-bot-id="${botId}"
          data-company="Your Business"
          defer></script>
</body>
</html>`)
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'resolve-rag-server', timestamp: new Date().toISOString() })
})

// Initialise the SQLite database (creates table if not exists)
initDatabase()

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Resolve RAG server running on port ${PORT}`)
  console.log(`Widget served at: http://localhost:${PORT}/widget/widget.js`)
  console.log(`Health check:     http://localhost:${PORT}/health`)
})
