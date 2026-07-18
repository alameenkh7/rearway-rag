'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    await queryInterface.createTable('admin_users', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      email: { type: Sequelize.STRING, allowNull: false },
      verified_at: { type: Sequelize.DATE, allowNull: true },
      otp_code_hash: { type: Sequelize.STRING, allowNull: true },
      otp_expires_at: { type: Sequelize.DATE, allowNull: true },
      otp_attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      otp_last_sent_at: { type: Sequelize.DATE, allowNull: true },
      role: { type: Sequelize.STRING, allowNull: false, defaultValue: 'owner' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
    })

    await queryInterface.addIndex('admin_users', ['email'], { unique: true, name: 'admin_users_email_key' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('admin_users')
  },
}
