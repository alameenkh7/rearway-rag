// Write-once/delete-only — chunks are never edited in place, so unlike
// every other entity this intentionally has no updatedAt.
export interface Chunk {
  id: string
  botId: string
  text: string
  embedding: number[]
  createdAt: Date
}
