const fs = require('fs')
const path = require('path')

// Constraint #3: no vector DB — store embeddings as plain JSON files
const VECTOR_DIR = path.join(__dirname, '../../data/vectors')

// Ensure directory exists at module load time
fs.mkdirSync(VECTOR_DIR, { recursive: true })

// Save the vector store for a bot to disk as {botId}.json
// Input:  botId      (string)
//         chunks     (string[])  — ordered array of text chunks
//         embeddings (number[][]) — parallel array of 1536-dim vectors
function saveVectorStore(botId, chunks, embeddings) {
  const data = {
    botId,
    createdAt: new Date().toISOString(),
    chunks: chunks.map((text, i) => ({ text, embedding: embeddings[i] })),
  }

  fs.writeFileSync(
    path.join(VECTOR_DIR, `${botId}.json`),
    JSON.stringify(data)
  )
}

// Load the vector store for a bot from disk
// Returns: { botId, createdAt, chunks: [{ text, embedding }] } or null if missing
function loadVectorStore(botId) {
  const filePath = path.join(VECTOR_DIR, `${botId}.json`)
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

module.exports = { saveVectorStore, loadVectorStore }
