'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		return queryInterface.createTable('asxtickers', {
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
			ticker: {
				type: Sequelize.DataTypes.STRING(255),
				allowNull: false,
			},
			startprice: {
				type: Sequelize.DataTypes.STRING(255),
				allowNull: false,
			},
			endprice: {
				type: Sequelize.DataTypes.STRING(255),
				allowNull: true,
			},
			date: {
				type: Sequelize.DataTypes.STRING(20),
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
		return queryInterface.dropTable('asxtickers');
	},
};
