import { Module } from '@nestjs/common'
import { CoreadapterModule } from '../../coreadapter/coreadapter.module'
import { PurgeCronService } from './purge-cron.service'

@Module({
  imports: [CoreadapterModule],
  providers: [PurgeCronService],
})
export class CronModule {}
