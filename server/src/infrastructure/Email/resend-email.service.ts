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
    if (!this.client) {
      // No RESEND_API_KEY configured. In production this must fail loudly —
      // silently console-logging while returning "sent" is exactly the
      // fake-success trap that hid the "no email ever delivered" problem.
      // In dev, keep the console fallback so local testing works without a key.
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'RESEND_API_KEY is not set — cannot send OTP email in production. ' +
            'Set it in the environment (see .env.example).'
        )
      }
      this.logger.warn(`RESEND_API_KEY not set — OTP for ${email} is: ${code}`)
      return
    }

    const { error } = await this.client.emails.send({
      from: this.from,
      to: email,
      subject: 'Your verification code',
      html: `<p>Your Resolve verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes.</p>`,
    })

    // Resend's SDK returns errors in the response body rather than throwing —
    // surface them so a rejected/failed send doesn't look like a success.
    if (error) {
      throw new Error(
        `Resend failed to send OTP email: ${error.name} — ${error.message}`
      )
    }
  }
}
