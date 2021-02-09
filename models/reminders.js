/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('reminders', {
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
		reminder_timestamp: {
			type: DataTypes.DATE,
			allowNull: true,
		},
		user: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		reminder: {
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
		tableName: 'reminders',
	});
};
