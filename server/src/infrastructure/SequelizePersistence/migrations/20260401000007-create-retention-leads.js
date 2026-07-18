'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('retention_leads', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      email: { type: Sequelize.STRING, allowNull: false },
      company_name: { type: Sequelize.STRING, allowNull: true },
      plan: { type: Sequelize.STRING, allowNull: false },
      captured_at: { type: Sequelize.DATE, allowNull: false },
      last_active_at: { type: Sequelize.DATE, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
    })

    await queryInterface.addIndex('retention_leads', ['email'], {
      unique: true,
      name: 'retention_leads_email_key',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('retention_leads')
  },
}
