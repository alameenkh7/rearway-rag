export interface EmailService {
  sendOtpEmail(email: string, code: string): Promise<void>
}
