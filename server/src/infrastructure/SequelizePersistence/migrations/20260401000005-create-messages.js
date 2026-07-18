'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('messages', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      session_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'sessions', key: 'id' },
        onDelete: 'CASCADE',
      },
      role: { type: Sequelize.STRING, allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
    })

    await queryInterface.addIndex('messages', ['session_id'])
  },

  async down(queryInterface) {
    await queryInterface.dropTable('messages')
  },
}
