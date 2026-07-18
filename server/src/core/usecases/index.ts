import { Deps } from '../entitygateway'
import { wrapUC, defaultWrappers } from './wrappers'
import * as RequestOtp from './commands/RequestOtp'
import * as VerifyOtp from './commands/VerifyOtp'
import * as CreateBot from './commands/CreateBot'
import * as StartSession from './commands/StartSession'
import * as SendMessage from './commands/SendMessage'
import * as PurgeExpiredTrials from './commands/PurgeExpiredTrials'
import * as GetBotStatus from './queries/GetBotStatus'

export function initUseCases(deps: Deps) {
  const requestOtp = wrapUC(
    deps,
    RequestOtp.makeUC(deps),
    RequestOtp.name,
    ...defaultWrappers
  )
  const verifyOtp = wrapUC(
    deps,
    VerifyOtp.makeUC(deps),
    VerifyOtp.name,
    ...defaultWrappers
  )
  const createBot = wrapUC(
    deps,
    CreateBot.makeUC(deps),
    CreateBot.name,
    ...defaultWrappers
  )
  const startSession = wrapUC(
    deps,
    StartSession.makeUC(deps),
    StartSession.name,
    ...defaultWrappers
  )
  const sendMessage = wrapUC(
    deps,
    SendMessage.makeUC(deps),
    SendMessage.name,
    ...defaultWrappers
  )
  // Explicit <void, ...> type args: PurgeExpiredTrials takes no input, and
  // Input=void is what lets callers invoke it with zero arguments (TS's
  // void-parameter special case) instead of inferring `unknown`.
  const purgeExpiredTrials = wrapUC<
    void,
    PurgeExpiredTrials.PurgeExpiredTrialsOutput
  >(
    deps,
    PurgeExpiredTrials.makeUC(deps),
    PurgeExpiredTrials.name,
    ...defaultWrappers
  )
  const getBotStatus = wrapUC(
    deps,
    GetBotStatus.makeUC(deps),
    GetBotStatus.name,
    ...defaultWrappers
  )

  return {
    queries: { getBotStatus },
    commands: {
      requestOtp,
      verifyOtp,
      createBot,
      startSession,
      sendMessage,
      purgeExpiredTrials,
    },
  }
}

export type UseCases = ReturnType<typeof initUseCases>
