import { Controller, Get, Inject, Param, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { ApiExcludeController } from '@nestjs/swagger'
import { CoreS } from '../../tokens'
import type { UseCases } from '../../core/usecases'
import { HandleRagErrors } from '../../shared/decorators/handle-rag-errors.decorator'

// Escapes values interpolated into the HTML below. companyName is
// admin-supplied text, so it must never be injected raw into a page we serve
// from our own origin.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

@ApiExcludeController() // an HTML page, not part of the JSON API surface
@Controller('widget')
export class WidgetController {
  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  // Ported from the legacy Express app's /widget/preview/:botId route, with
  // two required changes for the new API: the widget now needs a
  // data-embed-token attribute, and the token arrives via the query string so
  // that a botId alone doesn't grant preview (see GetBotPreview for why).
  @Get('preview/:botId')
  @HandleRagErrors('widget-preview')
  async preview(
    @Param('botId') botId: string,
    @Query('token') token: string,
    @Res() res: Response,
  ) {
    const bot = await this.useCases.queries.getBotPreview({
      botId,
      embedToken: token ?? '',
    })

    const widgetHostUrl =
      process.env.WIDGET_HOST_URL || 'http://localhost:4001/widget'
    const company = escapeHtml(bot.companyName)
    const safeBotId = escapeHtml(bot.botId)
    const safeToken = escapeHtml(token)

    res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${company} — Resolve Chatbot Preview</title>
  <style>
    body {
      margin: 0;
      background: #f8fafc;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .preview-banner { text-align: center; padding: 40px 24px; color: #64748b; }
    .preview-banner h1 { font-size: 1.5rem; color: #1e293b; margin-bottom: 8px; }
    .preview-banner p { margin: 0; font-size: 0.95rem; }
    .bot-id {
      display: inline-block;
      margin-top: 12px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 12px;
      font-family: monospace;
      font-size: 0.85rem;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="preview-banner">
    <h1>Your Resolve chatbot is ready.</h1>
    <p>It will appear in the bottom-right corner of this page.</p>
    <span class="bot-id">Bot ID: ${safeBotId}</span>
  </div>
  <script src="${widgetHostUrl}/widget.js"
          data-bot-id="${safeBotId}"
          data-embed-token="${safeToken}"
          data-company="${company}"
          defer></script>
</body>
</html>`)
  }
}
