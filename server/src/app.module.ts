import { join } from 'path'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SequelizeModule } from '@nestjs/sequelize'
import { ScheduleModule } from '@nestjs/schedule'
import { ServeStaticModule } from '@nestjs/serve-static'
import { HttpModule } from './gateways/http/http.module'
import { CronModule } from './infrastructure/Cron/cron.module'
import { AdminUserModel } from './infrastructure/SequelizePersistence/models/AdminUserModel'
import { BotModel } from './infrastructure/SequelizePersistence/models/BotModel'
import { SessionModel } from './infrastructure/SequelizePersistence/models/SessionModel'
import { MessageModel } from './infrastructure/SequelizePersistence/models/MessageModel'
import { RetentionLeadModel } from './infrastructure/SequelizePersistence/models/RetentionLeadModel'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Shared with the legacy Express app — same public/widget.js file,
    // served under /widget on this app too so widgetSnippet/previewUrl
    // (built from WIDGET_HOST_URL) actually resolve.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'public'),
      serveRoot: '/widget',
    }),
    SequelizeModule.forRoot({
      dialect: 'postgres',
      uri: process.env.DATABASE_URL,
      models: [
        AdminUserModel,
        BotModel,
        SessionModel,
        MessageModel,
        RetentionLeadModel,
      ],
      autoLoadModels: true,
      synchronize: false, // schema is owned entirely by sequelize-cli migrations
      logging: false,
    }),
    HttpModule,
    CronModule,
  ],
})
export class AppModule {}
