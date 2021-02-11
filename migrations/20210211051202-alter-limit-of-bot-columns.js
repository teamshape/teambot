'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('botlines', 'botline', {
        type: Sequelize.STRING(1000),
        allowNull: true,
        unique: true,
      }),
      queryInterface.changeColumn('welcomes', 'welcome', {
        type: Sequelize.STRING(1000),
        allowNull: true,
        unique: true,
      }),
    ])
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('botlines', 'botline', {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
      }),
      queryInterface.changeColumn('welcomes', 'welcome', {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
      }),
    ])
  }
};