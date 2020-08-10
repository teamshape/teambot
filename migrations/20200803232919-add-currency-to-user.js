'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		return queryInterface.sequelize.transaction(t => {
			return Promise.all([
				queryInterface.addColumn('users', 'dollars', {
					type: Sequelize.DataTypes.STRING,
					defaultValue: 50000,
				}, { transaction: t }),
			]);
		});
	},

	down: async (queryInterface, Sequelize) => {
		return queryInterface.sequelize.transaction(t => {
			return Promise.all([
				queryInterface.removeColumn('users', 'dollars', { transaction: t }),
			]);
		});
	},
};