'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('botlines', 'botline', {
        type: DataTypes.STRING(1000),
        allowNull: true,
        unique: true,
      }),
      queryInterface.changeColumn('welcomes', 'welcome', {
        type: DataTypes.STRING(1000),
        allowNull: true,
        unique: true,
      }),
    ])
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('botlines', 'botline', {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
      }),
      queryInterface.changeColumn('welcomes', 'welcome', {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
      }),
    ])
  }
};