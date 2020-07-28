/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('SequelizeMeta', {
		name: {
			type: DataTypes.STRING(255),
			allowNull: false,
			primaryKey: true
		}
	}, {
		sequelize,
		tableName: 'SequelizeMeta'
	});
};
