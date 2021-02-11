/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('botlines', {
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
		botline: {
			type: DataTypes.STRING(1000),
			allowNull: true,
			unique: true,
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
		tableName: 'botlines',
	});
};
