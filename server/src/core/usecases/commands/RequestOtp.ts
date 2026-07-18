import { Deps } from '../../entitygateway'
import {
  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
} from '../../constants'
import { OtpResendTooSoonError } from '../../../shared/errors/domain.errors'
import { generateOtpCode, hashOtpCode } from '../services/token.service'

export interface RequestOtpInput {
  email: string
}

export type RequestOtpOutput = { message: string }

export function makeUC(deps: Deps) {
  return async function requestOtp(
    input: RequestOtpInput
  ): Promise<RequestOtpOutput> {
    const {
      adminUserLoader,
      adminUserPersistor,
      emailService,
      retentionLeadPersistor,
    } = deps
    const email = input.email.trim().toLowerCase()

    const existing = await adminUserLoader.getAdminUserByEmail(email)
    if (existing?.otpLastSentAt) {
      const secondsSinceLastSend =
        (Date.now() - existing.otpLastSentAt.getTime()) / 1000
      if (secondsSinceLastSend < OTP_RESEND_COOLDOWN_SECONDS) {
        throw new OtpResendTooSoonError(
          Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSinceLastSend)
        )
      }
    }

    const code = generateOtpCode()
    const otpCodeHash = await hashOtpCode(code)
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    await adminUserPersistor.upsertForOtpRequest(
      email,
      otpCodeHash,
      otpExpiresAt
    )
    // Captured at request time, per the design doc's sequence — survives
    // the 15-day trial hard-purge since it's not a foreign key off Bot.
    await retentionLeadPersistor.upsertRetentionLead({ email, plan: 'trial' })
    await emailService.sendOtpEmail(email, code)

    return { message: 'Verification code sent.' }
  }
}

export const name = 'RequestOtp'
