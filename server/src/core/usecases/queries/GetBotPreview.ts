import { Deps } from '../../entitygateway'
import { ResourceNotFoundError } from '../../../shared/errors/domain.errors'
import { safeCompareToken } from '../services/token.service'

export interface GetBotPreviewInput {
  botId: string
  embedToken: string
}

export type GetBotPreviewOutput = {
  botId: string
  companyName: string
}

export function makeUC(deps: Deps) {
  return async function getBotPreview(
    input: GetBotPreviewInput,
  ): Promise<GetBotPreviewOutput> {
    const bot = await deps.botLoader.getBotById(input.botId)
    if (!bot) throw new ResourceNotFoundError('bot')

    // The preview URL is a capability URL: possession of the full link
    // (botId + embed token) is what grants access. Deliberately NOT keyed on
    // botId alone, or anyone who learned a botId could load this page and
    // read the embed token out of it — which would defeat the token's whole
    // purpose as a second factor on the chat endpoint. A mismatch reports
    // "not found" rather than "wrong token" so the endpoint doesn't confirm
    // which bot ids exist.
    if (!safeCompareToken(input.embedToken, bot.embedToken)) {
      throw new ResourceNotFoundError('bot')
    }

    return { botId: bot.id, companyName: bot.companyName }
  }
}

export const name = 'GetBotPreview'
