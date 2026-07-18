import { AdminUser } from '../entities'

export interface AdminUserLoader {
  getAdminUserById(id: string): Promise<AdminUser | null>
  getAdminUserByEmail(email: string): Promise<AdminUser | null>
}

export interface AdminUserPersistor {
  // Create if missing, otherwise overwrite the OTP fields on the existing row.
  upsertForOtpRequest(
    email: string,
    otpCodeHash: string,
    otpExpiresAt: Date
  ): Promise<AdminUser>
  incrementOtpAttempts(id: string): Promise<AdminUser>
  // Sets verifiedAt=now and clears the OTP fields.
  verifyOtp(id: string): Promise<AdminUser>
}
