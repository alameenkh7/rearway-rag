const { getDb } = require('./database')

// TRIAL_TOKEN_LIMIT is the default cap for trial bots
const TRIAL_TOKEN_LIMIT = 50000
const TRIAL_DAYS = 30

function insertBot({ id, companyName, businessType, email, description, websiteUrl, chunkCount, plan }) {
  const db = getDb()

  const resolvedPlan = plan === 'paid' ? 'paid' : 'trial'

  // Trial bots expire after TRIAL_DAYS; paid bots have no expiry
  const expiresAt = resolvedPlan === 'trial'
    ? new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()
    : null

  const tokenLimit = resolvedPlan === 'trial' ? TRIAL_TOKEN_LIMIT : null

  const stmt = db.prepare(`
    INSERT INTO bots
      (id, company_name, business_type, email, description, website_url,
       chunk_count, plan, expires_at, token_usage, token_limit)
    VALUES
      (@id, @companyName, @businessType, @email, @description, @websiteUrl,
       @chunkCount, @plan, @expiresAt, 0, @tokenLimit)
  `)

  stmt.run({
    id,
    companyName,
    businessType: businessType || null,
    email,
    description: description || null,
    websiteUrl: websiteUrl || null,
    chunkCount,
    plan: resolvedPlan,
    expiresAt,
    tokenLimit,
  })
}

function findBotById(id) {
  const db = getDb()
  return db.prepare('SELECT * FROM bots WHERE id = ?').get(id) || null
}

// Atomically increment token_usage for a bot after a chat completion
function addTokenUsage(id, tokensUsed) {
  const db = getDb()
  db.prepare('UPDATE bots SET token_usage = token_usage + ? WHERE id = ?').run(tokensUsed, id)
}

function listBots() {
  const db = getDb()
  return db
    .prepare(
      `SELECT id, company_name, email, status, created_at, chunk_count,
              plan, expires_at, token_usage, token_limit
       FROM bots ORDER BY created_at DESC`
    )
    .all()
}

module.exports = { insertBot, findBotById, addTokenUsage, listBots }
