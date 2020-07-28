/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('welcomes', {
		id: {
			autoIncrement: true,
			type: DataTypes.INTEGER,
			allowNull: true,
			primaryKey: true
		},
		guild: {
			type: DataTypes.STRING(255),
			allowNull: true
		},
		user: {
			type: DataTypes.STRING(255),
			allowNull: true
		},
		welcome: {
			type: DataTypes.STRING(255),
			allowNull: true
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
		tableName: 'welcomes'
	});
};
