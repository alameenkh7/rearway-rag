/**
 * Production-runnable twin of seed-demo-bots.ts.
 *
 * Identical behaviour, but requires from dist/ instead of src/ so it runs on a
 * bare `node` with production-only node_modules — prod has no ts-node or
 * tsconfig-paths, so the TypeScript version cannot execute there.
 *
 * Run from the server/ directory, after a build:
 *   node scripts/seed-demo-bots.js
 *
 * Idempotent: deletes and recreates any demo bot whose companyName already
 * exists, so re-running never stacks duplicate embeddings.
 */
require('reflect-metadata')
const { createNamespace } = require('cls-hooked')
const { Sequelize } = require('sequelize-typescript')
const { readFileSync, existsSync } = require('fs')
const { join } = require('path')

// The compiled layout differs per environment: a build of src/ alone emits
// dist/app.module.js, but once tsc also compiles scripts/ it adds the common
// parent and emits dist/src/app.module.js instead. Both shapes exist in the
// wild (local is flat, the EC2 deploy is nested), so probe rather than assume —
// hardcoding either one breaks the moment the two drift again.
const DIST = [
  join(__dirname, '..', 'dist'),
  join(__dirname, '..', 'dist', 'src'),
].find(dir => existsSync(join(dir, 'app.module.js')))

if (!DIST) {
  console.error(
    'No compiled app found. Looked for app.module.js in ../dist and ' +
      '../dist/src. Run `npm run build` first, and run this script from the ' +
      'server/ directory.'
  )
  process.exit(1)
}

// Must precede the AppModule require, exactly as in main.ts — chunk
// persistence uses raw sequelize.query and joins the ambient CLS transaction.
Sequelize.useCLS(createNamespace('resolve-rag-transactions'))

const { NestFactory } = require('@nestjs/core')
const { getModelToken } = require('@nestjs/sequelize')
const { AppModule } = require(join(DIST, 'app.module'))
const { CoreS } = require(join(DIST, 'tokens'))
const {
  AdminUserModel,
} = require(join(DIST, 'infrastructure/SequelizePersistence/models/AdminUserModel'))
const {
  BotModel,
} = require(join(DIST, 'infrastructure/SequelizePersistence/models/BotModel'))

const DEMO_ADMIN_EMAIL = 'demo@rearway.com'

/**
 * Flattens a business record into retrieval-friendly prose.
 *
 * chunkText is a blind 500-char sliding window over whitespace-collapsed text
 * (chunking.service.ts) — it has no idea where a sentence or an FAQ begins. So
 * every line restates the business name and its subject inline, letting a chunk
 * cut mid-stream still carry enough context to match a query and answer from.
 */
function toTrainingText(b) {
  const lines = []
  const info = b.business_info

  lines.push(`${b.name} — ${info.tagline || ''}. Category: ${b.category}.`)
  lines.push(
    `${b.name} contact details: address ${info.address}, phone ${info.phone}, email ${info.email}, website ${info.website}.`
  )

  if (info.hours) {
    const hours = Object.entries(info.hours)
      .map(([k, v]) => `${k.replace(/_/g, ' to ')}: ${v}`)
      .join('; ')
    lines.push(`${b.name} opening hours — ${hours}.`)
  }

  for (const s of b.services || []) {
    lines.push(`${b.name} offers this service: ${s}.`)
  }
  for (const s of b.services_with_pricing || []) {
    lines.push(`${b.name} service and price — ${s}.`)
  }

  if (b.size_guide) {
    for (const [size, measure] of Object.entries(b.size_guide)) {
      lines.push(
        size === 'note'
          ? `${b.name} sizing note: ${measure}`
          : `${b.name} size ${size} fits ${measure}.`
      )
    }
  }

  for (const [key, value] of Object.entries(b.policies)) {
    lines.push(`${b.name} ${key.replace(/_/g, ' ')} policy: ${value}`)
  }

  for (const f of b.faqs) {
    lines.push(`Question about ${b.name}: ${f.question} Answer: ${f.answer}`)
  }

  for (const note of b.extra_notes || []) {
    lines.push(note)
  }

  return lines.join('\n')
}

/**
 * CreateBot hardcodes trial semantics: plan 'trial', a 30-day expiresAt and a
 * 50k tokenLimit, all enforced at request time. Clearing them is what makes
 * these permanent demo bots rather than trials that expire mid-demo. Setting
 * plan away from 'trial' also lifts RateLimitGuard's daily per-IP cap.
 */
async function promoteBot(bots, botId) {
  await bots.update(
    { plan: 'business', expiresAt: null, tokenLimit: null },
    { where: { id: botId } }
  )
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  })

  // Checked only after bootstrap: ConfigModule.forRoot is what loads .env into
  // process.env, so reading this at module scope would report "not set" for a
  // key that is present in the env file.
  if (!process.env.OPENROUTER_API_KEY) {
    console.error(
      'OPENROUTER_API_KEY is not set. Bot creation embeds every chunk at ' +
        'creation time, so this would fail at the first bot. Aborting.'
    )
    await app.close()
    process.exit(1)
  }

  const useCases = app.get(CoreS)
  const adminUsers = app.get(getModelToken(AdminUserModel))
  const bots = app.get(getModelToken(BotModel))
  const widgetHostUrl = process.env.WIDGET_HOST_URL || 'https://rearway.com'

  // bots.admin_user_id is NOT NULL, so the demo bots still need an owner row.
  const [admin] = await adminUsers.findOrCreate({
    where: { email: DEMO_ADMIN_EMAIL },
    defaults: { email: DEMO_ADMIN_EMAIL, verifiedAt: new Date() },
  })

  const { businesses } = JSON.parse(
    readFileSync(join(__dirname, 'demo-businesses.json'), 'utf8')
  )

  const results = []

  for (const b of businesses) {
    const destroyed = await bots.destroy({ where: { companyName: b.name } })
    if (destroyed > 0) {
      console.log(`  (removed ${destroyed} existing "${b.name}" bot)`)
    }

    const out = await useCases.commands.createBot({
      adminUserId: admin.id,
      adminUserEmail: DEMO_ADMIN_EMAIL,
      companyName: b.name,
      businessType: b.category,
      // Deliberately no websiteUrl: OriginCheckGuard is a documented no-op when
      // it is null, so the widget works from rearway.com, www.rearway.com and
      // resolve.rearway.com without a 403.
      description: toTrainingText(b),
      contactEmail: b.contact_email,
      widgetHostUrl,
    })

    await promoteBot(bots, out.data.botId)

    results.push({
      key: b.id,
      name: b.name,
      botId: out.data.botId,
      embedToken: out.data.embedToken,
      chunks: out.data.chunkCount,
    })
    console.log(`✓ ${b.name} — ${out.data.chunkCount} chunks`)
  }

  console.log('\n=== DEMO BOT CREDENTIALS ===\n')
  console.log(JSON.stringify(results, null, 2))

  await app.close()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
