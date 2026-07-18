'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sessions', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      bot_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'bots', key: 'id' },
        onDelete: 'CASCADE',
      },
      token_hash: { type: Sequelize.STRING, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'active' },
      ip_address: { type: Sequelize.STRING, allowNull: false },
      user_agent: { type: Sequelize.STRING, allowNull: true },
      last_activity_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
    })

    await queryInterface.addIndex('sessions', ['bot_id'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sessions')
  },
}
