// Input:  string (full text), options { chunkSize: 500, overlap: 50 }
// Output: string[] — array of overlapping text chunks
//
// Strategy:
//   1. Collapse all whitespace runs into a single space and trim
//   2. Slide a window of `chunkSize` characters across the text
//   3. Each next window starts `chunkSize - overlap` characters after the previous one
//   4. Filter out any chunk shorter than 50 characters (likely noise)
function chunkText(text, options = {}) {
  const chunkSize = options.chunkSize || 500
  const overlap = options.overlap || 50

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
