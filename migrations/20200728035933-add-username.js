'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		return queryInterface.sequelize.transaction(t => {
			return Promise.all([
				queryInterface.addColumn('users', 'name', {
					type: Sequelize.DataTypes.STRING,
				}, { transaction: t }),
			]);
		});
	},

	down: async (queryInterface, Sequelize) => {
		return queryInterface.sequelize.transaction(t => {
			return Promise.all([
				queryInterface.removeColumn('users', 'name', { transaction: t }),
			]);
		});
	},
};