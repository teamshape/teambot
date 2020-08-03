/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('asx', {
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
		user: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		ticker: {
			type: DataTypes.STRING(255),
			allowNull: false,
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
		tableName: 'asx',
	});
};
