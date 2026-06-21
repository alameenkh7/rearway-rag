const express = require('express')
const { v4: uuidv4 } = require('uuid')
const OpenAI = require('openai')

const { findBotById, addTokenUsage } = require('../db/bots')
const { loadVectorStore } = require('../rag/vectorStore')
const { embedQuery } = require('../rag/embed')
const { findRelevantChunks } = require('../rag/search')

const router = express.Router()

let openai

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://resolve.rearway.com',
        'X-Title': 'Resolve RAG',
      },
    })
  }
  return openai
}

// POST /api/chat/:botId
// Constraint #10: CORS is open on this endpoint since the widget runs on customer sites.
//                 The global cors() middleware in server.js already covers this.
router.post('/:botId', async (req, res) => {
  const { botId } = req.params
  const { message, sessionId } = req.body

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' })
  }

  // Step 1: Load bot from SQLite
  const bot = findBotById(botId)
  if (!bot) {
    return res.status(404).json({ error: 'Bot not found' })
  }

  // ── Trial gates ────────────────────────────────────────────────────────────

  // Gate 1: Time expiry (trial only)
  if (bot.plan === 'trial' && bot.expires_at) {
    if (new Date(bot.expires_at) < new Date()) {
      return res.status(402).json({
        error: 'trial_expired',
        message: `This bot's trial period ended on ${new Date(bot.expires_at).toLocaleDateString()}. Please upgrade to continue.`,
        upgradeUrl: 'https://rearway.com/resolve',
      })
    }
  }

  // Gate 2: Token limit (trial only)
  if (bot.plan === 'trial' && bot.token_limit !== null) {
    if (bot.token_usage >= bot.token_limit) {
      return res.status(402).json({
        error: 'token_limit_reached',
        message: `This bot has used its ${bot.token_limit.toLocaleString()} trial token allowance. Please upgrade to continue.`,
        upgradeUrl: 'https://rearway.com/resolve',
      })
    }
  }

  // ──────────────────────────────────────────────────────────────────────────

  // Step 2: Load vector store from disk
  const vectorStore = loadVectorStore(botId)
  if (!vectorStore) {
    return res.status(404).json({ error: 'Vector store not found for this bot' })
  }

  try {
    // Step 3: Embed the user message
    const queryVector = await embedQuery(message.trim())

    // Step 4: Find top 4 relevant chunks via cosine similarity
    const contextChunks = findRelevantChunks(queryVector, vectorStore, 4)

    // Step 5: Build the prompt
    const systemMessage = {
      role: 'system',
      content: `You are a helpful assistant for ${bot.company_name}. Answer based ONLY on the context provided. If you can't find the answer in the context, say so honestly.`,
    }

    const userMessage = {
      role: 'user',
      content: `Context:\n${contextChunks.join('\n---\n')}\n\nQuestion: ${message.trim()}`,
    }

    // Step 6: Call OpenRouter chat completion
    const client = getOpenAI()
    const completion = await client.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      messages: [systemMessage, userMessage],
      max_tokens: 500,
      temperature: 0.3,
    })

    const answer = completion.choices[0].message.content.trim()

    // Step 7: Track token usage for trial bots
    // OpenRouter returns usage.total_tokens in the response
    if (bot.plan === 'trial' && completion.usage && completion.usage.total_tokens) {
      addTokenUsage(botId, completion.usage.total_tokens)
    }

    // Step 8: Return the answer + a session ID
    return res.json({
      answer,
      sessionId: sessionId || uuidv4(),
    })
  } catch (err) {
    console.error('[chat/:botId] Error:', err.message)
    return res.status(500).json({ error: 'Internal server error', details: err.message })
  }
})

module.exports = router
