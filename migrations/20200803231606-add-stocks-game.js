'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		return Promise.all([
			queryInterface.createTable('holdings', {
				id: {
					autoIncrement: true,
					type: Sequelize.DataTypes.INTEGER,
					allowNull: false,
					primaryKey: true,
				},
				guild: {
					type: Sequelize.DataTypes.STRING(255),
					allowNull: false,
				},
				userId: {
					type: Sequelize.DataTypes.STRING(255),
					model: 'users',
					key: 'user',
					allowNull: false,
				},
				ticker: {
					type: Sequelize.DataTypes.STRING(255),
					allowNull: false,
				},
				amount: {
					type: Sequelize.DataTypes.INTEGER,
					allowNull: false,
				},
				createdAt: {
					type: Sequelize.DataTypes.DATE,
					allowNull: false,
				},
				updatedAt: {
					type: Sequelize.DataTypes.DATE,
					allowNull: false,
				},
			}),
			queryInterface.createTable('log', {
				id: {
					autoIncrement: true,
					type: Sequelize.DataTypes.INTEGER,
					allowNull: false,
					primaryKey: true,
				},
				guild: {
					type: Sequelize.DataTypes.STRING(255),
					allowNull: false,
				},
				userId: {
					type: Sequelize.DataTypes.STRING(255),
					allowNull: false,
					model: 'users',
					key: 'user',
				},
				message: {
					type: Sequelize.DataTypes.STRING(255),
					allowNull: false,
				},
				createdAt: {
					type: Sequelize.DataTypes.DATE,
					allowNull: false,
				},
				updatedAt: {
					type: Sequelize.DataTypes.DATE,
					allowNull: false,
				},
			}),
		]);
	},
	down: async (queryInterface, Sequelize) => {
		return Promise.all([
			queryInterface.dropTable('holdings'),
			queryInterface.dropTable('log'),
		]);
	},
};
