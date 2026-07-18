import { Column, DataType, Model, Table } from 'sequelize-typescript'

@Table({
  tableName: 'messages',
  underscored: true,
  timestamps: true,
  updatedAt: false,
})
export class MessageModel extends Model {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string

  @Column({ type: DataType.UUID, allowNull: false })
  declare sessionId: string

  @Column({ type: DataType.STRING, allowNull: false })
  declare role: string

  @Column({ type: DataType.TEXT, allowNull: false })
  declare content: string

  declare readonly createdAt: Date
}
