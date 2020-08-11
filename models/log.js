/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('log', {
		id: {
			autoIncrement: true,
			type: DataTypes.INTEGER,
			allowNull: true,
			primaryKey: true,
			unique: true,
		},
		guild: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		userId: {
			type: DataTypes.STRING(255),
			model: 'users',
			key: 'user',
			allowNull: false,
		},
		message: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		amount: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		ticker: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		buy: {
			type: DataTypes.INTEGER(1),
		},
		sell: {
			type: DataTypes.INTEGER(1),
		},
		executed: {
			type: DataTypes.INTEGER(1),
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
		tableName: 'log',
	});
};
