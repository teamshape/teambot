/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('asxtickers', {
		id: {
			autoIncrement: true,
			type: DataTypes.INTEGER,
			allowNull: true,
			primaryKey: true,
		},
		guild: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		ticker: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		startprice: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		endprice: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		date: {
			type: DataTypes.STRING(20),
			allowNull: false,
		},
		createdAt: {
			type: DataTypes.DATE,
			allowNull: false,
		},
		updatedAt: {
			type: DataTypes.DATE,
			allowNull: false,
		},
	}, {
		sequelize,
		tableName: 'asxtickers',
	});
};
