import { Deps } from '../../entitygateway'
import { BotPublic } from '../../entities'
import { ResourceNotFoundError } from '../../../shared/errors/domain.errors'

export interface GetBotStatusInput {
  botId: string
}

export type GetBotStatusOutput = BotPublic

export function makeUC(deps: Deps) {
  return async function getBotStatus(
    input: GetBotStatusInput
  ): Promise<GetBotStatusOutput> {
    const bot = await deps.botLoader.getBotById(input.botId)
    if (!bot) throw new ResourceNotFoundError('bot')

    const { embedToken: _embedToken, ...botPublic } = bot
    return botPublic
  }
}

export const name = 'GetBotStatus'
