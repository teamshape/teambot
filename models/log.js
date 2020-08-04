/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('log', {
		id: {
			autoIncrement: true,
			type: DataTypes.INTEGER,
			allowNull: true,
			primaryKey: true
		},
		guild: {
			type: DataTypes.STRING(255),
			allowNull: false
		},
		userId: {
			type: DataTypes.STRING(255),
			model: 'users',
			key: 'user',
			allowNull: false,
		},
		message: {
			type: DataTypes.STRING(255),
			allowNull: false
		},
		createdAt: {
			type: DataTypes.DATE,
			allowNull: false
		},
		updatedAt: {
			type: DataTypes.DATE,
			allowNull: false
		}
	}, {
		sequelize,
		tableName: 'log'
	});
};
