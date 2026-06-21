const express = require('express')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')

const { upload } = require('../middleware/upload')
const { extractTextFromPdf } = require('../rag/extract')
const { scrapeWebsite } = require('../rag/scrape')
const { chunkText } = require('../rag/chunk')
const { embedChunks } = require('../rag/embed')
const { saveVectorStore } = require('../rag/vectorStore')
const { insertBot, findBotById } = require('../db/bots')

const router = express.Router()

// POST /api/bots/create
// Accepts multipart/form-data — optional PDF, optional websiteUrl, optional description
// At least one text source (pdf, websiteUrl, or description) must be provided
router.post('/create', upload.single('pdf'), async (req, res) => {
  const { companyName, email, businessType, description, websiteUrl, plan } = req.body
  const pdfFile = req.file

  // Step 1: Validate required fields
  if (!companyName || !companyName.trim()) {
    if (pdfFile) fs.unlinkSync(pdfFile.path)
    return res.status(400).json({ success: false, error: 'companyName is required' })
  }
  if (!email || !email.trim()) {
    if (pdfFile) fs.unlinkSync(pdfFile.path)
    return res.status(400).json({ success: false, error: 'email is required' })
  }

  // Validate websiteUrl format if provided
  if (websiteUrl && websiteUrl.trim()) {
    try {
      new URL(websiteUrl.trim())
    } catch (_) {
      if (pdfFile) fs.unlinkSync(pdfFile.path)
      return res.status(400).json({ success: false, error: 'websiteUrl must be a valid URL (include https://)' })
    }
  }

  try {
    // Step 2: Generate bot ID
    const botId = uuidv4()

    // Step 3: Collect text from all available sources
    let textContent = ''
    let pagesScraped = 0

    // Source A: PDF
    if (pdfFile) {
      const buffer = fs.readFileSync(pdfFile.path)
      const pdfText = await extractTextFromPdf(buffer)
      textContent += pdfText + '\n'
    }

    // Source B: Website scraping
    if (websiteUrl && websiteUrl.trim()) {
      try {
        console.log(`[bots/create] Scraping website: ${websiteUrl.trim()}`)
        const result = await scrapeWebsite(websiteUrl.trim())
        textContent += result.text + '\n'
        pagesScraped = result.pagesScraped
        console.log(`[bots/create] Scraped ${pagesScraped} pages from ${websiteUrl.trim()}`)
      } catch (scrapeErr) {
        console.warn(`[bots/create] Website scraping failed: ${scrapeErr.message}`)
        // Non-fatal — continue if other sources have content
      }
    }

    // Source C: Manual description
    if (description && description.trim()) {
      textContent += description.trim() + '\n'
    }

    if (!textContent.trim()) {
      if (pdfFile) fs.unlinkSync(pdfFile.path)
      return res.status(400).json({
        success: false,
        error: 'Please provide at least one of: a PDF, a website URL, or a description',
      })
    }

    // Step 4: Chunk the combined text
    const chunks = chunkText(textContent)

    if (chunks.length === 0) {
      if (pdfFile) fs.unlinkSync(pdfFile.path)
      return res.status(400).json({
        success: false,
        error: 'Could not extract meaningful text from the provided content',
      })
    }

    // Step 5: Get embeddings from OpenRouter
    const embeddings = await embedChunks(chunks)

    // Step 6: Save vector store as JSON file
    saveVectorStore(botId, chunks, embeddings)

    // Step 7: Save bot metadata to SQLite (includes plan + trial limits)
    insertBot({
      id: botId,
      companyName: companyName.trim(),
      businessType: businessType ? businessType.trim() : null,
      email: email.trim(),
      description: description ? description.trim() : null,
      websiteUrl: websiteUrl ? websiteUrl.trim() : null,
      chunkCount: chunks.length,
      plan: plan || 'trial',
    })

    // Step 8: Delete the temp uploaded PDF
    if (pdfFile) {
      fs.unlinkSync(pdfFile.path)
    }

    // Step 9: Return success response
    const widgetHostUrl = process.env.WIDGET_HOST_URL || `http://localhost:${process.env.PORT || 4000}/widget`
    const widgetSnippet = `<script src="${widgetHostUrl}/widget.js" data-bot-id="${botId}" data-company="${companyName.trim()}" defer></script>`
    const previewUrl = `${widgetHostUrl}/preview/${botId}`

    return res.status(201).json({
      success: true,
      botId,
      companyName: companyName.trim(),
      plan: plan === 'paid' ? 'paid' : 'trial',
      chunkCount: chunks.length,
      pagesScraped: pagesScraped || undefined,
      widgetSnippet,
      previewUrl,
    })
  } catch (err) {
    // Clean up temp file on any error
    if (pdfFile && fs.existsSync(pdfFile.path)) {
      fs.unlinkSync(pdfFile.path)
    }
    console.error('[bots/create] Error:', err.message)
    return res.status(500).json({ success: false, error: 'Internal server error', details: err.message })
  }
})

// GET /api/bots/:botId
// Returns public bot metadata — botId is the only access control
router.get('/:botId', (req, res) => {
  const { botId } = req.params
  const bot = findBotById(botId)

  if (!bot) {
    return res.status(404).json({ success: false, error: 'Bot not found' })
  }

  const trialInfo = bot.plan === 'trial' ? {
    expiresAt: bot.expires_at,
    tokenUsage: bot.token_usage,
    tokenLimit: bot.token_limit,
    tokensRemaining: bot.token_limit ? Math.max(0, bot.token_limit - bot.token_usage) : null,
  } : {}

  return res.json({
    botId: bot.id,
    companyName: bot.company_name,
    businessType: bot.business_type,
    websiteUrl: bot.website_url,
    status: bot.status,
    plan: bot.plan,
    chunkCount: bot.chunk_count,
    createdAt: bot.created_at,
    ...trialInfo,
  })
})

module.exports = router
