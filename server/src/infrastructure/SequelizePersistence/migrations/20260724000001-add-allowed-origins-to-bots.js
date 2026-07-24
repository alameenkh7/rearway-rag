'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('bots', 'allowed_origins', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('bots', 'allowed_origins')
  },
}
