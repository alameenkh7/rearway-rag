const { getDb } = require('./database')

function insertBot({ id, companyName, businessType, email, description, chunkCount }) {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO bots (id, company_name, business_type, email, description, chunk_count)
    VALUES (@id, @companyName, @businessType, @email, @description, @chunkCount)
  `)
  stmt.run({ id, companyName, businessType, email, description, chunkCount })
}

function findBotById(id) {
  const db = getDb()
  return db.prepare('SELECT * FROM bots WHERE id = ?').get(id) || null
}

function listBots() {
  const db = getDb()
  return db.prepare('SELECT id, company_name, email, status, created_at, chunk_count FROM bots ORDER BY created_at DESC').all()
}

module.exports = { insertBot, findBotById, listBots }
