/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('alerts', {
		id: {
			autoIncrement: true,
			type: DataTypes.INTEGER,
			allowNull: true,
			primaryKey: true,
		},
		guild: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		channel: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		user: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		stock: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		operator: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		price: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		status: {
			type: DataTypes.INTEGER(1),
			allowNull: true,
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
		tableName: 'alerts',
	});
};
