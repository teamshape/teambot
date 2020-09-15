/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('bans', {
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
		moderator: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		user: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		banDate: {
			type: DataTypes.DATE,
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
		tableName: 'bans',
	});
};
