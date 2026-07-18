// Plain TS type describing a raw sequelize.query() result row — not a
// @Table-decorated Model, because Sequelize has no `vector` column type.
// See chunk-persistence.service.ts for the raw-SQL implementation this
// type supports.
export interface ChunkRow {
  id: string
  bot_id: string
  text: string
  created_at: Date
  score?: string | number
}
