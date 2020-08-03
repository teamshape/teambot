'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		return queryInterface.createTable('reports', {
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
			reporter: {
				type: Sequelize.DataTypes.STRING(255),
				allowNull: true,
			},
			reported: {
				type: Sequelize.DataTypes.STRING(255),
				allowNull: true,
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
		return queryInterface.dropTable('reports');
	},
};
