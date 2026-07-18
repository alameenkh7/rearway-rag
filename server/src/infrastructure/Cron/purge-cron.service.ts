import { Inject, Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { CoreS } from '../../tokens'
import type { UseCases } from '../../core/usecases'

@Injectable()
export class PurgeCronService {
  private readonly logger = new Logger('PurgeCronService')

  constructor(@Inject(CoreS) private readonly useCases: UseCases) {}

  @Cron('0 3 * * *') // 3am server time, nightly
  async handlePurge() {
    const result = await this.useCases.commands.purgeExpiredTrials()
    this.logger.log(result.message)
  }
}
