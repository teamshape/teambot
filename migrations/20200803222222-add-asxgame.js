'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.createTable('asx', {
      id: {
        autoIncrement: true,
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      guild: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: false
      },
      user: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: false
      },
      ticker: {
        type: Sequelize.DataTypes.STRING(255),
        allowNull: false
      },
      date: {
        type: Sequelize.DataTypes.STRING(20),
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DataTypes.DATE,
        allowNull: false
      }
    }).then(() => queryInterface.addIndex(
      'asx',
      {
        fields: ['user', 'date'],
        unique: true,
      }
    )).then(() => queryInterface.addIndex(
      'asx',
      {
        fields: ['ticker', 'date'],
        unique: true,
      }
    ))
  },
  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable('asx');
  }
};
