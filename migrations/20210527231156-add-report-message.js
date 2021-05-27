'use strict';

module.exports = {
	up: async (queryInterface, Sequelize) => {
		return queryInterface.sequelize.transaction(t => {
			return Promise.all([
				queryInterface.addColumn('reports', 'message', {
					type: Sequelize.DataTypes.STRING(1000),
				}, { transaction: t }),
			]);
		});
	},

	down: async (queryInterface, Sequelize) => {
		return queryInterface.sequelize.transaction(t => {
			return Promise.all([
				queryInterface.removeColumn('reports', 'message', { transaction: t }),
			]);
		});
	},
};