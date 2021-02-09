'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('alerts', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      }),
      queryInterface.changeColumn('bans', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      }),
      queryInterface.changeColumn('botlines', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      }),
      queryInterface.changeColumn('chats', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      }),
      queryInterface.changeColumn('holdings', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      }),
      queryInterface.changeColumn('karmas', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      }),
      queryInterface.changeColumn('kvs', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      }),
      queryInterface.changeColumn('log', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      }),
      queryInterface.changeColumn('reminders', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      }),
      queryInterface.changeColumn('reports', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      }),
      queryInterface.changeColumn('users', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      }),
      queryInterface.changeColumn('welcomes', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
      }),
      queryInterface.addIndex('holdings', ['userId']),
      queryInterface.addIndex('users', ['dollars']),
      queryInterface.addIndex('chats', ['createdAt']),
      queryInterface.addIndex('users', ['createdAt'])
    ])
  },

  down: async (queryInterface, Sequelize) => {
    return Promise.all([
      queryInterface.changeColumn('alerts', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true
      }),
      queryInterface.changeColumn('bans', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true
      }),
      queryInterface.changeColumn('botlines', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true
      }),
      queryInterface.changeColumn('chats', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true
      }),
      queryInterface.changeColumn('holdings', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true
      }),
      queryInterface.changeColumn('karmas', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true
      }),
      queryInterface.changeColumn('kvs', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true
      }),
      queryInterface.changeColumn('log', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true
      }),
      queryInterface.changeColumn('reminders', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true
      }),
      queryInterface.changeColumn('reports', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true
      }),
      queryInterface.changeColumn('users', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true
      }),
      queryInterface.changeColumn('welcomes', 'id', {
        autoIncrement: true,
        type: Sequelize.INTEGER,
        allowNull: true,
        primaryKey: true
      }),
      queryInterface.removeIndex('holdings', ['userId']),
      queryInterface.removeIndex('users', ['dollars']),
      queryInterface.removeIndex('chats', ['createdAt']),
      queryInterface.removeIndex('users', ['createdAt'])
    ])
  }
};