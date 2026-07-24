import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({ tableName: 'bots', underscored: true, timestamps: true })
export class BotModel extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string

  @Column({ type: DataType.UUID, allowNull: false })
  declare adminUserId: string

  @Column({ type: DataType.STRING, allowNull: false })
  declare companyName: string

  @Column({ type: DataType.STRING, allowNull: true })
  declare businessType: string | null

  @Column({ type: DataType.STRING, allowNull: true })
  declare websiteUrl: string | null

  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true })
  declare allowedOrigins: string[] | null

  @Column({ type: DataType.TEXT, allowNull: true })
  declare description: string | null

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'trial' })
  declare plan: string

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare embedToken: string

  @Column({ type: DataType.STRING, allowNull: false, defaultValue: 'active' })
  declare status: string

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare chunkCount: number

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare tokenUsage: number

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare tokenLimit: number | null

  @Column({ type: DataType.DATE, allowNull: true })
  declare expiresAt: Date | null

  @Column({ type: DataType.TEXT, allowNull: true })
  declare fallbackMessage: string | null

  @Column({ type: DataType.STRING, allowNull: false })
  declare contactEmail: string

  declare readonly createdAt: Date
  declare readonly updatedAt: Date
}
