/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('kvs', {
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
		key: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		value: {
			type: DataTypes.STRING(255),
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
		tableName: 'kvs',
	});
};
