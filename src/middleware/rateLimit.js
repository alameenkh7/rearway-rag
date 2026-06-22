const { getDb } = require('../db/database')
const { findBotById } = require('../db/bots')

// Read whitelisted IPs from environment, defaults to empty array if not set
const WHITELISTED_IPS = process.env.WHITELISTED_IPS ? process.env.WHITELISTED_IPS.split(',').map(ip => ip.trim()) : []
const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT || '15', 10) // Max messages per IP per bot per day for trial

function checkRateLimit(req, res, next) {
  // Get IP address, handle reverse proxies
  let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
  // If x-forwarded-for contains multiple IPs, take the first one (original client)
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim()
  }

  const botId = req.params.botId
  const today = new Date().toISOString().split('T')[0] // 'YYYY-MM-DD'

  // 1. Check Whitelist
  if (WHITELISTED_IPS.includes(ip)) {
    return next()
  }

  // 2. Check Trial Plan (only limit trial bots)
  const bot = findBotById(botId)
  if (!bot || bot.plan !== 'trial') {
    return next() // Not a trial bot or doesn't exist, let the route handle it
  }

  const db = getDb()

  // 3. Check Database Usage
  const stmt = db.prepare(`
    SELECT message_count FROM daily_usage 
    WHERE ip_address = ? AND bot_id = ? AND date = ?
  `)
  const record = stmt.get(ip, botId, today)

  if (record && record.message_count >= DAILY_LIMIT) {
    // Limit reached!
    return res.status(429).json({
      error: "rate_limit_exceeded",
      message: "You have reached your daily message limit for this demo. Please try again tomorrow."
    })
  }

  // 4. Increment Usage
  const insert = db.prepare(`
    INSERT INTO daily_usage (ip_address, bot_id, date, message_count)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(ip_address, bot_id, date) 
    DO UPDATE SET message_count = message_count + 1
  `)
  insert.run(ip, botId, today)

  next()
}

module.exports = { checkRateLimit }
