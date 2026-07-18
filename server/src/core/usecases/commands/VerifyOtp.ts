import { Deps } from '../../entitygateway'
import {
  OTP_MAX_ATTEMPTS,
  VERIFICATION_TOKEN_TTL_MINUTES,
} from '../../constants'
import {
  ResourceNotFoundError,
  OtpLockedError,
  OtpExpiredError,
  InvalidOtpError,
} from '../../../shared/errors/domain.errors'
import { compareOtpCode } from '../services/token.service'

export interface VerifyOtpInput {
  email: string
  code: string
}

export type VerifyOtpOutput = {
  message: string
  data: { verificationToken: string; expiresIn: number }
}

export function makeUC(deps: Deps) {
  return async function verifyOtp(
    input: VerifyOtpInput
  ): Promise<VerifyOtpOutput> {
    const { adminUserLoader, adminUserPersistor, tokenService } = deps
    const email = input.email.trim().toLowerCase()

    const adminUser = await adminUserLoader.getAdminUserByEmail(email)
    if (!adminUser) throw new ResourceNotFoundError('admin_user')

    if (adminUser.otpAttempts >= OTP_MAX_ATTEMPTS) throw new OtpLockedError()
    if (!adminUser.otpExpiresAt || adminUser.otpExpiresAt < new Date())
      throw new OtpExpiredError()
    if (!adminUser.otpCodeHash) throw new InvalidOtpError()

    const matches = await compareOtpCode(input.code, adminUser.otpCodeHash)
    if (!matches) {
      await adminUserPersistor.incrementOtpAttempts(adminUser.id)
      throw new InvalidOtpError()
    }

    await adminUserPersistor.verifyOtp(adminUser.id)

    const verificationToken = tokenService.signVerificationToken({
      adminUserId: adminUser.id,
      email,
    })

    return {
      message: 'Email verified.',
      data: {
        verificationToken,
        expiresIn: VERIFICATION_TOKEN_TTL_MINUTES * 60,
      },
    }
  }
}

export const name = 'VerifyOtp'
