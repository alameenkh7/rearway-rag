import { CHUNK_SIZE_CHARS, CHUNK_OVERLAP_CHARS } from '../../constants'

// Ported verbatim from the legacy rag/chunk.js algorithm:
//   1. Collapse all whitespace runs into a single space and trim
//   2. Slide a window of `chunkSize` characters across the text
//   3. Each next window starts `chunkSize - overlap` characters after the previous one
//   4. Filter out any chunk shorter than 50 characters (likely noise)
export function chunkText(
  text: string,
  options: { chunkSize?: number; overlap?: number } = {}
): string[] {
  const chunkSize = options.chunkSize ?? CHUNK_SIZE_CHARS
  const overlap = options.overlap ?? CHUNK_OVERLAP_CHARS

  const cleaned = text.replace(/\s+/g, ' ').trim()
  const chunks: string[] = []
  let start = 0

  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length)
    chunks.push(cleaned.slice(start, end).trim())
    start += chunkSize - overlap
  }

  return chunks.filter(c => c.length > 50)
}
