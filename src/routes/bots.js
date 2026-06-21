const express = require('express')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')

const { upload } = require('../middleware/upload')
const { extractTextFromPdf } = require('../rag/extract')
const { chunkText } = require('../rag/chunk')
const { embedChunks } = require('../rag/embed')
const { saveVectorStore } = require('../rag/vectorStore')
const { insertBot, findBotById } = require('../db/bots')

const router = express.Router()

// POST /api/bots/create
// Accepts multipart/form-data with optional PDF upload
router.post('/create', upload.single('pdf'), async (req, res) => {
  const { companyName, email, businessType, description } = req.body
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

  try {
    // Step 2: Generate bot ID
    const botId = uuidv4()

    // Step 3: Collect text from PDF and/or description
    let textContent = ''

    if (pdfFile) {
      const buffer = fs.readFileSync(pdfFile.path)
      const pdfText = await extractTextFromPdf(buffer)
      textContent += pdfText
    }

    if (description && description.trim()) {
      textContent += ' ' + description.trim()
    }

    if (!textContent.trim()) {
      if (pdfFile) fs.unlinkSync(pdfFile.path)
      return res.status(400).json({
        success: false,
        error: 'Please provide a PDF or description',
      })
    }

    // Step 4: Chunk the text
    const chunks = chunkText(textContent)

    if (chunks.length === 0) {
      if (pdfFile) fs.unlinkSync(pdfFile.path)
      return res.status(400).json({
        success: false,
        error: 'Could not extract meaningful text from the provided content',
      })
    }

    // Step 5: Get embeddings from OpenAI
    const embeddings = await embedChunks(chunks)

    // Step 6: Save vector store as JSON file
    saveVectorStore(botId, chunks, embeddings)

    // Step 7: Save bot metadata to SQLite
    insertBot({
      id: botId,
      companyName: companyName.trim(),
      businessType: businessType ? businessType.trim() : null,
      email: email.trim(),
      description: description ? description.trim() : null,
      chunkCount: chunks.length,
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
      chunkCount: chunks.length,
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
// Returns public bot metadata — botId is the only access control (constraint #9)
router.get('/:botId', (req, res) => {
  const { botId } = req.params
  const bot = findBotById(botId)

  if (!bot) {
    return res.status(404).json({ success: false, error: 'Bot not found' })
  }

  return res.json({
    botId: bot.id,
    companyName: bot.company_name,
    businessType: bot.business_type,
    status: bot.status,
    chunkCount: bot.chunk_count,
    createdAt: bot.created_at,
  })
})

module.exports = router
