// Constraint #5: cosine similarity implemented manually — no library
//
// Cosine similarity = (A · B) / (|A| × |B|)
// Returns a value in [-1, 1] — higher means more similar
function cosineSimilarity(a, b) {
  let dot = 0
  let magA = 0
  let magB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  if (denom === 0) return 0

  return dot / denom
}

// Input:  queryEmbedding (number[])
//         vectorStore    ({ chunks: [{ text: string, embedding: number[] }] })
//         topK           (number, default 4)
// Output: string[] — top K most relevant chunk texts, ranked by cosine similarity
function findRelevantChunks(queryEmbedding, vectorStore, topK = 4) {
  const scored = vectorStore.chunks.map(chunk => ({
    text: chunk.text,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }))

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, topK).map(s => s.text)
}

module.exports = { cosineSimilarity, findRelevantChunks }
