/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('holdings', {
		id: {
			autoIncrement: true,
			type: DataTypes.INTEGER,
			allowNull: false,
			primaryKey: true,
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
		ticker: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		amount: {
			type: DataTypes.INTEGER,
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
		tableName: 'holdings',
	});
};
