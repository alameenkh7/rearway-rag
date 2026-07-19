import 'reflect-metadata'
import { createNamespace } from 'cls-hooked'
import { Sequelize } from 'sequelize-typescript'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { setupSwagger } from './gateways/http/swagger/swagger.setup'
import { DomainErrorFilter } from './shared/filters/domain-error.filter'

// Must run before AppModule's SequelizeModule.forRoot instantiates the
// connection, so every query made inside TransactionManager.runInTransaction
// (including chunk-persistence.service.ts's raw sequelize.query calls)
// automatically joins the ambient transaction via CLS.
Sequelize.useCLS(createNamespace('resolve-rag-transactions'))

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors() // widget runs on arbitrary customer domains — mirrors the legacy app's open CORS
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  // Catches BaseError from guards too, which @HandleRagErrors cannot reach.
  app.useGlobalFilters(new DomainErrorFilter())
  setupSwagger(app)
  await app.listen(process.env.PORT ?? 4001)
}
void bootstrap()
