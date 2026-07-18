import { Deps } from '../../entitygateway'
import { TRIAL_HARD_DELETE_DAYS } from '../../constants'

export type PurgeExpiredTrialsOutput = {
  message: string
  data: { purgedBotIds: string[] }
}

export function makeUC(deps: Deps) {
  return async function purgeExpiredTrials(): Promise<PurgeExpiredTrialsOutput> {
    const { botLoader, botPersistor, logger } = deps
    const cutoff = new Date(
      Date.now() - TRIAL_HARD_DELETE_DAYS * 24 * 60 * 60 * 1000
    )

    const expiredBots = await botLoader.listExpiredTrialBots(cutoff)
    const purgedBotIds: string[] = []

    for (const bot of expiredBots) {
      try {
        // A single DELETE with ON DELETE CASCADE (sessions -> messages,
        // chunks) is already atomic per bot — no application-level
        // transaction needed here, unlike CreateBot's multi-table insert.
        // RetentionLead is never touched: no FK, no lookup attempted.
        await botPersistor.deleteBot(bot.id)
        purgedBotIds.push(bot.id)
      } catch (err) {
        // One bot's purge failure shouldn't stop the rest of the batch.
        logger.error(
          `Failed to purge expired trial bot ${bot.id}`,
          err instanceof Error ? err.stack : String(err)
        )
      }
    }

    return {
      message: `Purged ${purgedBotIds.length} expired trial bot(s)`,
      data: { purgedBotIds },
    }
  }
}

export const name = 'PurgeExpiredTrials'
