// Lets a use case group several persistence calls into one atomic unit
// without a Sequelize Transaction type ever leaking into core — only
// CreateBot needs this (Bot row + Chunk rows must succeed or fail together).
export interface TransactionManager {
  runInTransaction<T>(fn: () => Promise<T>): Promise<T>
}
