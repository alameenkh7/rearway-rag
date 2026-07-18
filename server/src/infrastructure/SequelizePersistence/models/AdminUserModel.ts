import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'admin_users', underscored: true, timestamps: true })
export class AdminUserModel extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string

  @Column({ type: DataType.STRING, unique: true, allowNull: false })
  declare email: string

  @Column({ type: DataType.DATE, allowNull: true })
  declare verifiedAt: Date | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare otpCodeHash: string | null

  @Column({ type: DataType.DATE, allowNull: true })
  declare otpExpiresAt: Date | null

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare otpAttempts: number

  @Column({ type: DataType.DATE, allowNull: true })
  declare otpLastSentAt: Date | null

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'owner' })
  declare role: string

  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}
