import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/sequelize'
import { Sequelize } from 'sequelize-typescript'
import { TransactionManager } from '../../core/entitygateway/TransactionManager'

@Injectable()
export class SequelizeTransactionManager implements TransactionManager {
  constructor(@InjectConnection() private readonly sequelize: Sequelize) {}

  // Relies on CLS (see main.ts's Sequelize.useCLS call) so every persistence
  // call made anywhere inside `fn` — including chunk-persistence.service.ts's
  // raw sequelize.query() calls — automatically joins this transaction
  // without a Transaction object being threaded through any gateway method.
  runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
    return this.sequelize.transaction(() => fn())
  }
}
