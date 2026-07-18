require('dotenv').config()

// sequelize-cli reads this file directly (not through ts-node), so it stays plain JS.
// DATABASE_URL is the single source of truth — local dev and production both set it,
// only the value differs (docker-compose Postgres vs Neon).
const url = process.env.DATABASE_URL

const shared = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
}

module.exports = {
  development: { ...shared },
  test: { ...shared },
  production: { ...shared, dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } },
}

if (!url) {
  // eslint-disable-next-line no-console
  console.warn('[sequelize-cli config] DATABASE_URL is not set — migrations will fail to connect.')
}
