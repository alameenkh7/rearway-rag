const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_DIR = path.join(__dirname, '../../data')
const DB_PATH = path.join(DB_DIR, 'resolve.db')

// Ensure data directory exists
fs.mkdirSync(DB_DIR, { recursive: true })

let db

function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
  }
  return db
}

function initDatabase() {
  const database = getDb()

  // Base table — created on first run
  database.exec(`
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      business_type TEXT,
      email TEXT NOT NULL,
      description TEXT,
      website_url TEXT,
      chunk_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active',
      plan TEXT DEFAULT 'trial',
      expires_at DATETIME,
      token_usage INTEGER DEFAULT 0,
      token_limit INTEGER DEFAULT 50000
    );
  `)

  // Rate limiting table — IP and Bot ID tracking
  database.exec(`
    CREATE TABLE IF NOT EXISTS daily_usage (
      ip_address TEXT,
      bot_id TEXT,
      date TEXT,
      message_count INTEGER DEFAULT 1,
      PRIMARY KEY (ip_address, bot_id, date)
    );
  `)

  // Migration: safely add new columns to existing databases.
  // SQLite does not support ALTER TABLE ... ADD COLUMN IF NOT EXISTS,
  // so we attempt each column and swallow the "duplicate column" error.
  const migrations = [
    `ALTER TABLE bots ADD COLUMN website_url TEXT`,
    `ALTER TABLE bots ADD COLUMN plan TEXT DEFAULT 'trial'`,
    `ALTER TABLE bots ADD COLUMN expires_at DATETIME`,
    `ALTER TABLE bots ADD COLUMN token_usage INTEGER DEFAULT 0`,
    `ALTER TABLE bots ADD COLUMN token_limit INTEGER DEFAULT 50000`,
  ]

  for (const sql of migrations) {
    try {
      database.exec(sql)
    } catch (err) {
      // "duplicate column name" — column already exists, safe to ignore
      if (!err.message.includes('duplicate column name')) {
        throw err
      }
    }
  }

  console.log('Database initialised at', DB_PATH)
}

module.exports = { getDb, initDatabase }
