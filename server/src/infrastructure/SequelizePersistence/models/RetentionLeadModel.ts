import { Column, DataType, Model, Table } from 'sequelize-typescript'

// No foreign keys at all, by design — this table must survive the trial
// hard-purge cron untouched.
@Table({ tableName: 'retention_leads', underscored: true, timestamps: true })
export class RetentionLeadModel extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string

  @Column({ type: DataType.STRING, unique: true, allowNull: false })
  declare email: string

  @Column({ type: DataType.STRING, allowNull: true })
  declare companyName: string | null

  @Column({ type: DataType.STRING, allowNull: false })
  declare plan: string

  @Column({ type: DataType.DATE, allowNull: false })
  declare capturedAt: Date

  @Column({ type: DataType.DATE, allowNull: false })
  declare lastActiveAt: Date

  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}
