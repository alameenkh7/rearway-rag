import { AdminUserRole } from '../../codecs'

export interface AdminUser {
  id: string
  email: string
  verifiedAt?: Date
  otpCodeHash?: string
  otpExpiresAt?: Date
  otpAttempts: number
  otpLastSentAt?: Date
  role: AdminUserRole
  createdAt: Date
  updatedAt: Date
}

// otpCodeHash is the "password" equivalent — never returned to a client.
export type AdminUserPublic = Omit<AdminUser, 'otpCodeHash'>
