'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		return queryInterface.createTable('responses', {
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
			author: {
				type: Sequelize.DataTypes.STRING(255),
				allowNull: true,
			},
      		user: {
        		type: Sequelize.DataTypes.INTEGER(1),
        		allowNull: true,
      		},
      		react: {
        		type: Sequelize.DataTypes.INTEGER(1),
		        allowNull: true,
      		},
      		word: {
        		type: Sequelize.DataTypes.INTEGER(1),
        		allowNull: true,
      		},
			target: {
				type: Sequelize.DataTypes.STRING(255),
				allowNull: true,
			},
      		response: {
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
		return queryInterface.dropTable('responses');
	},
};
