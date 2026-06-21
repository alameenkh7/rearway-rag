const OpenAI = require('openai')

// Constraint #7: text-embedding-3-small returns 1536-dimension vectors
// Using OpenRouter as the API gateway — model name must be prefixed with provider
const EMBED_MODEL = 'openai/text-embedding-3-small'
const BATCH_SIZE = 100 // OpenAI allows up to 2048 inputs per request

let client

function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://resolve.rearway.com',
        'X-Title': 'Resolve RAG',
      },
    })
  }
  return client
}

// Input:  string[] — array of text chunks
// Output: number[][] — embedding vectors in the same order as input
async function embedChunks(chunks) {
  const openai = getClient()
  const embeddings = []

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const response = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: batch,
    })
    embeddings.push(...response.data.map(d => d.embedding))
  }

  return embeddings
}

// Input:  string — a single user query
// Output: number[] — a single 1536-dim embedding vector
async function embedQuery(query) {
  const openai = getClient()
  const response = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: [query],
  })
  return response.data[0].embedding
}

module.exports = { embedChunks, embedQuery }
