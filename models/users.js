/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('users', {
		id: {
			autoIncrement: true,
			type: DataTypes.INTEGER,
			allowNull: false,
			primaryKey: true,
		},
		guild: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		user: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		permission: {
			type: DataTypes.INTEGER,
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
		name: {
			type: DataTypes.STRING(255),
			allowNull: true
		},
		dollars: {
			type: DataTypes.STRING(255),
			allowNull: true,
			defaultValue: '50000',
		},
		name: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
	}, {
		sequelize,
		tableName: 'users',
		indexes: [
			{ unique: true, fields: ['guild', 'user'] },
			{ fields: ['dollars'] },
			{ fields: ['createdAt'] }
		]
	});
};
