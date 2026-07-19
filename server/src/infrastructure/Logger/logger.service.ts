import { Injectable, Logger as NestLogger } from '@nestjs/common'
import { Logger } from '../../core/entitygateway/Logger'

@Injectable()
export class LoggerService implements Logger {
  private readonly nestLogger = new NestLogger('UseCase')

  log(message: string, context?: string): void {
    this.nestLogger.log(message, context)
  }

  error(message: string, trace?: string, context?: string): void {
    this.nestLogger.error(message, trace, context)
  }

  warn(message: string, context?: string): void {
    this.nestLogger.warn(message, context)
  }

  debug(message: string, context?: string): void {
    this.nestLogger.debug(message, context)
  }
}
