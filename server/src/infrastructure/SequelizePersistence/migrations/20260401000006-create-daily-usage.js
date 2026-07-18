'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('daily_usage', {
      ip_address: { type: Sequelize.STRING, primaryKey: true },
      bot_id: { type: Sequelize.UUID, primaryKey: true },
      date: { type: Sequelize.STRING, primaryKey: true },
      message_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('daily_usage')
  },
}
