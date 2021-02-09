/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('reports', {
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
		channel: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		reporter: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		reported: {
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
		tableName: 'reports',
	});
};
