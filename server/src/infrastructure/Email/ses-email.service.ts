import { Injectable, Logger } from '@nestjs/common'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { EmailService } from '../../core/entitygateway/EmailService'

@Injectable()
export class SesEmailService implements EmailService {
  private readonly logger = new Logger('SesEmailService')
  private readonly client: SESClient | null
  private readonly from: string

  constructor() {
    const region = process.env.AWS_SES_REGION ?? process.env.AWS_REGION
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

    this.client = region
      ? new SESClient({
          region,
          ...(accessKeyId && secretAccessKey
            ? { credentials: { accessKeyId, secretAccessKey } }
            : {}),
        })
      : null

    const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? 'onboarding@resolve.rearway.com'
    const fromName = process.env.EMAIL_FROM_NAME ?? 'Resolve'
    this.from = `${fromName} <${fromAddress}>`
  }

  async sendOtpEmail(email: string, code: string): Promise<void> {
    if (!this.client) {
      // No AWS_SES_REGION configured. In production this must fail loudly —
      // silently console-logging while returning "sent" is exactly the
      // fake-success trap that hid the "no email ever delivered" problem.
      // In dev, keep the console fallback so local testing works without creds.
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          'AWS_SES_REGION is not set — cannot send OTP email in production. ' +
            'Set it (and credentials, if not using an instance role) in the environment.',
        )
      }
      this.logger.warn(`AWS SES not configured — OTP for ${email} is: ${code}`)
      return
    }

    const command = new SendEmailCommand({
      Source: this.from,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Data: 'Your verification code', Charset: 'UTF-8' },
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: `<p>Your Resolve verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p><p>This code expires in 10 minutes.</p>`,
          },
        },
      },
    })

    try {
      // SES throws on rejection/failure (unlike Resend's error-in-body pattern),
      // so a failed send naturally propagates instead of looking like success.
      await this.client.send(command)
    } catch (err) {
      const e = err as Error
      throw new Error(`SES failed to send OTP email: ${e.name} — ${e.message}`)
    }
  }
}
