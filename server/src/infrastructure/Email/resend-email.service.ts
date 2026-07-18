import { Injectable, Logger } from '@nestjs/common'
import { Resend } from 'resend'
import { EmailService } from '../../core/entitygateway/EmailService'

@Injectable()
export class ResendEmailService implements EmailService {
  private readonly logger = new Logger('ResendEmailService')
  private readonly client: Resend | null
  private readonly from: string

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    this.client = apiKey ? new Resend(apiKey) : null
    this.from = process.env.EMAIL_FROM ?? 'Resolve <onboarding@resend.dev>'
  }

  async sendOtpEmail(email: string, code: string): Promise<void> {
    // No RESEND_API_KEY configured yet — dev-only fallback so the OTP flow is
    // testable end-to-end before a real Resend account is wired in. Never
    // silently no-ops: the code always lands somewhere it can be read.
    if (!this.client) {
      this.logger.warn(`RESEND_API_KEY not set — OTP for ${email} is: ${code}`)
      return
    }

    await this.client.emails.send({
      from: this.from,
      to: email,
      subject: 'Your verification code',
      html: `<p>Your Resolve verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes.</p>`,
    })
  }
}
