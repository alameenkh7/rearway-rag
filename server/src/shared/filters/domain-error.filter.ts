import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { BaseError } from '../errors/base.error'

const logger = new Logger('DomainError')

// @HandleRagErrors only wraps the controller handler body, so it never sees a
// BaseError thrown from a guard — guards run earlier in the pipeline. That left
// every guard-thrown domain error (invalid embed token, bad origin, expired
// session, rate limit) falling through to Nest's default filter as a generic
// 500, which in turn made the widget's 401-retry path unreachable.
//
// A filter sits outside the whole pipeline, so it catches guards, pipes,
// interceptors and handlers alike. The response body is intentionally identical
// to the decorator's — { error, message, ...details } — so a given error looks
// the same to the widget no matter where it was raised.
@Catch(BaseError)
export class DomainErrorFilter implements ExceptionFilter {
  catch(err: BaseError, host: ArgumentsHost) {
    const http = host.switchToHttp()
    const response = http.getResponse<Response>()
    const request = http.getRequest<Request>()

    const details =
      err.details && typeof err.details === 'object' ? err.details : {}

    const context = `${request.method} ${request.url} -> ${err.statusCode} ${err.errorCode}`
    if (err.statusCode >= 500) {
      logger.error(context, err.stack)
    } else {
      // 4xx is the client's fault, not ours — don't page anyone over it.
      logger.warn(context)
    }

    response.status(err.statusCode).json({
      error: err.errorCode,
      message: err.message,
      ...details,
    })
  }
}
