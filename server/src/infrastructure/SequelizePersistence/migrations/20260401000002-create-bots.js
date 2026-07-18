'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bots', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      admin_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'admin_users', key: 'id' },
        onDelete: 'CASCADE',
      },
      company_name: { type: Sequelize.STRING, allowNull: false },
      business_type: { type: Sequelize.STRING, allowNull: true },
      website_url: { type: Sequelize.STRING, allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      plan: { type: Sequelize.STRING, allowNull: false, defaultValue: 'trial' },
      embed_token: { type: Sequelize.STRING, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'active' },
      chunk_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      token_usage: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      token_limit: { type: Sequelize.INTEGER, allowNull: true },
      expires_at: { type: Sequelize.DATE, allowNull: true },
      fallback_message: { type: Sequelize.TEXT, allowNull: true },
      contact_email: { type: Sequelize.STRING, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('now()') },
    })

    await queryInterface.addIndex('bots', ['admin_user_id'])
    await queryInterface.addIndex('bots', ['embed_token'], { unique: true, name: 'bots_embed_token_key' })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bots')
  },
}
