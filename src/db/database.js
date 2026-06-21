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

  database.exec(`
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      business_type TEXT,
      email TEXT NOT NULL,
      description TEXT,
      chunk_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active'
    );
  `)

  console.log('Database initialised at', DB_PATH)
}

module.exports = { getDb, initDatabase }
