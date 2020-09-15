'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		return queryInterface.createTable('bans', {
			id: {
				autoIncrement: true,
				type: Sequelize.DataTypes.INTEGER,
				allowNull: true,
				primaryKey: true,
			},
			guild: {
				type: Sequelize.DataTypes.STRING(255),
				allowNull: true,
			},
			channel: {
				type: Sequelize.DataTypes.STRING(255),
				allowNull: true,
			},
			moderator: {
				type: Sequelize.DataTypes.STRING(255),
				allowNull: true,
			},
			user: {
				type: Sequelize.DataTypes.STRING(255),
				allowNull: true,
			},
			banDate: {
				type: Sequelize.DataTypes.DATE,
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
		});
	},

	down: async (queryInterface, Sequelize) => {
		return queryInterface.dropTable('bans');
	},
};
