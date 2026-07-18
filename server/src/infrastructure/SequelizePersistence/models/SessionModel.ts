import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'sessions', underscored: true, timestamps: true })
export class SessionModel extends Model {
  @Column({ type: DataType.UUID, primaryKey: true })
  declare id: string

  @Column({ type: DataType.UUID, allowNull: false })
  declare botId: string

  @Column({ type: DataType.STRING, allowNull: false })
  declare tokenHash: string

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'active' })
  declare status: string

  @Column({ type: DataType.STRING, allowNull: false })
  declare ipAddress: string

  @Column({ type: DataType.STRING, allowNull: true })
  declare userAgent: string | null

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare lastActivityAt: Date

  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}
