/**
 * Seeds the three demo bots used by the marketing/demo UI.
 *
 * Bypasses the OTP + VerificationTokenGuard flow by calling the CreateBot use
 * case directly through a standalone Nest context — these are showcase bots,
 * not real customer signups, so there is no admin user to verify.
 *
 * After creation each bot is patched out of trial semantics (see promoteBot),
 * because a demo that silently dies after 30 days or 50k tokens is worse than
 * no demo at all.
 *
 *   npx ts-node -r tsconfig-paths/register scripts/seed-demo-bots.ts
 *
 * Idempotent: re-running deletes and recreates any demo bot whose companyName
 * already exists, so embeddings are never silently duplicated.
 */
import 'reflect-metadata'
import { createNamespace } from 'cls-hooked'
import { Sequelize } from 'sequelize-typescript'
import { readFileSync } from 'fs'
import { join } from 'path'

// Must precede AppModule import/instantiation, exactly as in main.ts — chunk
// persistence uses raw sequelize.query and joins the ambient CLS transaction.
Sequelize.useCLS(createNamespace('resolve-rag-transactions'))

/* eslint-disable @typescript-eslint/no-var-requires */
import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { CoreS } from '../src/tokens'
import type { UseCases } from '../src/core/usecases'
import { getModelToken } from '@nestjs/sequelize'
import { AdminUserModel } from '../src/infrastructure/SequelizePersistence/models/AdminUserModel'
import { BotModel } from '../src/infrastructure/SequelizePersistence/models/BotModel'

const DEMO_ADMIN_EMAIL = 'demo@rearway.com'

interface Faq {
  question: string
  answer: string
}
interface Business {
  id: string
  name: string
  category: string
  contact_email: string
  business_info: Record<string, unknown>
  services?: string[]
  services_with_pricing?: string[]
  size_guide?: Record<string, string>
  policies: Record<string, string>
  faqs: Faq[]
  extra_notes?: string[]
}

/**
 * Flattens a business record into retrieval-friendly prose.
 *
 * chunkText is a blind 500-char sliding window over whitespace-collapsed text
 * (chunking.service.ts) — it has no idea where a sentence or an FAQ begins. So
 * every line here restates the business name and its subject inline, letting a
 * chunk that gets cut mid-stream still carry enough context to match a query
 * and to answer from. Long prose paragraphs would lose that on the split.
 */
function toTrainingText(b: Business): string {
  const lines: string[] = []
  const info = b.business_info as Record<string, string | undefined> & {
    hours?: Record<string, string>
  }

  lines.push(`${b.name} — ${info.tagline ?? ''}. Category: ${b.category}.`)
  lines.push(
    `${b.name} contact details: address ${info.address}, phone ${info.phone}, email ${info.email}, website ${info.website}.`
  )

  if (info.hours) {
    const hours = Object.entries(info.hours)
      .map(([k, v]) => `${k.replace(/_/g, ' to ')}: ${v}`)
      .join('; ')
    lines.push(`${b.name} opening hours — ${hours}.`)
  }

  for (const s of b.services ?? []) {
    lines.push(`${b.name} offers this service: ${s}.`)
  }
  for (const s of b.services_with_pricing ?? []) {
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

  for (const note of b.extra_notes ?? []) {
    lines.push(note)
  }

  return lines.join('\n')
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  })

  // Read after bootstrap: ConfigModule.forRoot is what loads .env into
  // process.env, so this is empty at module scope.
  const widgetHostUrl = process.env.WIDGET_HOST_URL ?? 'https://rearway.com'

  const useCases = app.get<UseCases>(CoreS)
  const adminUsers = app.get<typeof AdminUserModel>(
    getModelToken(AdminUserModel)
  )
  const bots = app.get<typeof BotModel>(getModelToken(BotModel))

  // bots.admin_user_id is NOT NULL, so the demo bots still need an owner row.
  const [admin] = await adminUsers.findOrCreate({
    where: { email: DEMO_ADMIN_EMAIL },
    defaults: { email: DEMO_ADMIN_EMAIL, verifiedAt: new Date() },
  })

  const { businesses } = JSON.parse(
    readFileSync(join(__dirname, 'demo-businesses.json'), 'utf8')
  ) as { businesses: Business[] }

  const results: Array<Record<string, string | number>> = []

  for (const b of businesses) {
    // Re-running must not stack duplicate embeddings for the same company.
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
      // it is null (origin-check.guard.ts:20), so the widget works from
      // rearway.com, www.rearway.com and localhost without a 403.
      description: toTrainingText(b),
      contactEmail: b.contact_email,
      widgetHostUrl: widgetHostUrl,
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

  console.log('\n=== DEMO BOT IDS ===\n')
  console.log(JSON.stringify(results, null, 2))

  await app.close()
}

/**
 * CreateBot hardcodes trial semantics: plan 'trial', a 30-day expiresAt and a
 * 50k tokenLimit. All three are enforced at request time — expiry and token
 * limit throw 402 from StartSession/SendMessage, and RateLimitGuard applies its
 * daily per-IP cap only when plan === 'trial'. Clearing them is what makes
 * these permanent demo bots rather than trials that expire mid-demo.
 */
async function promoteBot(bots: typeof BotModel, botId: string) {
  await bots.update(
    { plan: 'business', expiresAt: null, tokenLimit: null },
    { where: { id: botId } }
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
