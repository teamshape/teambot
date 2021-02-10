/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('chats', {
		id: {
			autoIncrement: true,
			type: DataTypes.INTEGER,
			allowNull: false,
			primaryKey: true,
		},
		messageId: {
			type: DataTypes.INTEGER,
			allowNull: true,
			unique: true,
		},
		guild: {
			type: DataTypes.INTEGER,
			allowNull: true,
		},
		channel: {
			type: DataTypes.INTEGER,
			allowNull: true,
		},
		user: {
			type: DataTypes.INTEGER,
			allowNull: true,
		},
		chatline: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		deleted: {
			type: DataTypes.INTEGER(1),
			allowNull: true,
		},
		edited: {
			type: DataTypes.INTEGER(1),
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
		tableName: 'chats',
		indexes: [
			{ fields: ['guild', 'user'] },
			{ fields: ['guild', 'channel'] },
			{ fields: ['createdAt'] },
			{ fields: ['channel'] }
		]
	});
};
