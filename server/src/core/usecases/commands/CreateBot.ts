import { Deps } from '../../entitygateway'
import {
  DEFAULT_FALLBACK_MESSAGE,
  TRIAL_ACCESS_WINDOW_DAYS,
  TRIAL_MAX_SCRAPE_PAGES,
  TRIAL_TOKEN_LIMIT,
} from '../../constants'
import {
  ValidationError,
  IngestionFailedError,
} from '../../../shared/errors/domain.errors'
import { chunkText } from '../services/chunking.service'
import { generateEmbedToken } from '../services/token.service'

export interface CreateBotInput {
  adminUserId: string // from VerificationTokenGuard, never from the request body
  companyName: string
  businessType?: string
  websiteUrl?: string
  description?: string
  pdfBuffer?: Buffer
  fallbackMessage?: string
  contactEmail?: string
  adminUserEmail: string // for the contactEmail default — avoids a second AdminUser lookup
  widgetHostUrl: string // read from config by the controller, not from core
}

export type CreateBotOutput = {
  message: string
  data: {
    botId: string
    embedToken: string
    widgetSnippet: string
    previewUrl: string
    chunkCount: number
    pagesScraped?: number
  }
}

export function makeUC(deps: Deps) {
  return async function createBot(
    input: CreateBotInput
  ): Promise<CreateBotOutput> {
    const {
      botPersistor,
      chunkPersistor,
      llmService,
      scrapingService,
      pdfExtractionService,
      transactionManager,
    } = deps

    const hasPdf = Boolean(input.pdfBuffer)
    const hasWebsite = Boolean(input.websiteUrl?.trim())
    const hasDescription = Boolean(input.description?.trim())

    if (!hasPdf && !hasWebsite && !hasDescription) {
      throw new ValidationError(
        'Please provide at least one of: a PDF, a website URL, or a description.'
      )
    }

    let textContent = ''
    let pagesScraped: number | undefined

    if (input.pdfBuffer) {
      textContent +=
        (await pdfExtractionService.extractText(input.pdfBuffer)) + '\n'
    }

    if (hasWebsite) {
      try {
        const result = await scrapingService.scrapeWebsite(
          input.websiteUrl!.trim(),
          {
            maxPages: TRIAL_MAX_SCRAPE_PAGES,
          }
        )
        textContent += result.text + '\n'
        pagesScraped = result.pagesScraped
      } catch (err) {
        // Non-fatal if another source has content, same as the legacy behavior.
        if (!hasPdf && !hasDescription) {
          throw new IngestionFailedError(
            `Could not extract any content from ${input.websiteUrl}: ${err instanceof Error ? err.message : String(err)}`
          )
        }
      }
    }

    if (hasDescription) {
      textContent += input.description!.trim() + '\n'
    }

    const chunks = chunkText(textContent)
    if (chunks.length === 0) {
      throw new ValidationError(
        'Could not extract meaningful text from the provided content.'
      )
    }

    const embeddings = await llmService.embedChunks(chunks)
    const embedToken = generateEmbedToken()
    const expiresAt = new Date(
      Date.now() + TRIAL_ACCESS_WINDOW_DAYS * 24 * 60 * 60 * 1000
    )
    const contactEmail = input.contactEmail?.trim() || input.adminUserEmail
    const fallbackMessage = (
      input.fallbackMessage?.trim() || DEFAULT_FALLBACK_MESSAGE
    ).replace('{contactEmail}', contactEmail)

    const bot = await transactionManager.runInTransaction(async () => {
      const created = await botPersistor.createBot({
        adminUserId: input.adminUserId,
        companyName: input.companyName.trim(),
        businessType: input.businessType?.trim(),
        websiteUrl: hasWebsite ? input.websiteUrl!.trim() : undefined,
        description: hasDescription ? input.description!.trim() : undefined,
        embedToken,
        chunkCount: chunks.length,
        expiresAt,
        tokenLimit: TRIAL_TOKEN_LIMIT,
        fallbackMessage,
        contactEmail,
      })

      await chunkPersistor.bulkInsertChunks(
        created.id,
        chunks.map((text, i) => ({ text, embedding: embeddings[i] }))
      )

      return created
    })

    const widgetSnippet = `<script src="${input.widgetHostUrl}/widget.js" data-bot-id="${bot.id}" data-embed-token="${embedToken}" data-company="${bot.companyName}" defer></script>`
    const previewUrl = `${input.widgetHostUrl}/preview/${bot.id}`

    return {
      message: 'Bot created successfully',
      data: {
        botId: bot.id,
        embedToken,
        widgetSnippet,
        previewUrl,
        chunkCount: chunks.length,
        pagesScraped,
      },
    }
  }
}

export const name = 'CreateBot'
