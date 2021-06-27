'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.createTable('audit', {
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
      event: {
				type: Sequelize.DataTypes.STRING(255),
				allowNull: true,
			},
			message: {
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
    return queryInterface.dropTable('audit');
  }
};
