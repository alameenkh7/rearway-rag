require('dotenv').config()

// sequelize-cli reads this file directly (not through ts-node), so it stays plain JS.
// DATABASE_URL is the single source of truth — local dev and production both set it,
// only the value differs (docker-compose Postgres vs Neon/RDS/etc).
const url = process.env.DATABASE_URL

// Whether SSL is needed depends on which Postgres server DATABASE_URL points
// at, not which NODE_ENV the app happens to run under — a local dev machine
// can perfectly validly connect to a remote managed Postgres that requires
// SSL. DATABASE_SSL is the explicit, independent toggle for that; app.module.ts
// applies the same flag for the actual running app's connection.
const useSsl = process.env.DATABASE_SSL === 'true'

const shared = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  ...(useSsl ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } } : {}),
}

module.exports = {
  development: { ...shared },
  test: { ...shared },
  production: { ...shared },
}

if (!url) {
  // eslint-disable-next-line no-console
  console.warn('[sequelize-cli config] DATABASE_URL is not set — migrations will fail to connect.')
}
