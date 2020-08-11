'use strict';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();
		try {
			await queryInterface.addColumn(
				'log',
				'amount',
				{
					type: Sequelize.DataTypes.STRING,
				},
				{ transaction },
			);
			await queryInterface.addColumn(
				'log',
				'ticker',
				{
					type: Sequelize.DataTypes.STRING,
				},
				{ transaction },
			);
			await queryInterface.addColumn(
				'log',
				'buy',
				{
					type: Sequelize.DataTypes.INTEGER(1),
				},
				{ transaction },
			);
			await queryInterface.addColumn(
				'log',
				'sell',
				{
					type: Sequelize.DataTypes.INTEGER(1),
				},
				{ transaction },
			);
			await queryInterface.addColumn(
				'log',
				'executed',
				{
					type: Sequelize.DataTypes.INTEGER(1),
					defaultValue: 1,
				},
				{ transaction },
			);
			await transaction.commit();
		}
		catch (err) {
			await transaction.rollback();
			throw err;
		}
	},
	async down(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();
		try {
			await queryInterface.removeColumn('log', 'amount', { transaction });
			await queryInterface.removeColumn('log', 'ticker', { transaction });
			await queryInterface.removeColumn('log', 'buy', { transaction });
			await queryInterface.removeColumn('log', 'sell', { transaction });
			await queryInterface.removeColumn('log', 'executed', { transaction });
			await transaction.commit();
		}
		catch (err) {
			await transaction.rollback();
			throw err;
		}
	},
};