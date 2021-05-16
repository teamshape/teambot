/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('responses', {
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
		author: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		  user: {
			type: DataTypes.INTEGER(1),
			allowNull: true,
		  },
		  react: {
			type: DataTypes.INTEGER(1),
			allowNull: true,
		  },
		  word: {
			type: DataTypes.INTEGER(1),
			allowNull: true,
		  },
		  target: {
			type: DataTypes.STRING(255),
			allowNull: true,
		},
		  response: {
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
		tableName: 'responses'
	});
};
