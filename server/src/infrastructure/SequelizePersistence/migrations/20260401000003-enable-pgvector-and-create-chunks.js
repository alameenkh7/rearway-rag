'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;')

    await queryInterface.sequelize.query(`
      CREATE TABLE chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        embedding vector(1536) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `)

    // No IVFFlat/HNSW index — trial-scale bots (a few hundred chunks,
    // filtered by bot_id first) don't need approximate search; a brute-force
    // <=> scan within one bot's chunk set is fast at this volume. Revisit if
    // a single bot's chunk count grows into the tens of thousands.
    await queryInterface.sequelize.query('CREATE INDEX chunks_bot_id_idx ON chunks (bot_id);')
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS chunks;')
    await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS vector;')
  },
}
