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
      // DATABASE_SSL is an explicit toggle, independent of NODE_ENV — see
      // the matching comment in SequelizePersistence/config/config.js.
      // Without this, the app connects fine locally but fails on any
      // managed Postgres (Neon, RDS, etc.) that requires an encrypted
      // connection, with a "no pg_hba.conf entry ... no encryption" error.
      ...(process.env.DATABASE_SSL === 'true'
        ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }
        : {}),
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
