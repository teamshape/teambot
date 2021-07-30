const db = require('../models/index');

exports.get = async function(guild, key) {
	try {
		const dbValue = await db.kvs.findOne({ where: {
			guild: guild.id,
			key: key,
		} });
		const value = dbValue.dataValues.value;
		if (typeof value !== 'undefined' && value !== null) {
			return `Key [${key}] is set to [${value}]`;
		}
		return false;
	}
	catch (e) {
		console.log(e);
		return `Error getting key [${key}]`;
	}
};

exports.set = async function(guild, key, value) {
	try {
		await db.kvs.create({
			guild: guild.id,
			key: key,
			value: value,
		});
		const response = `New key [${key}] has been set to [${value}]`;
		return response;
	}
	catch (error) {
		if (error.name === 'SequelizeUniqueConstraintError') {
			try {
				await db.kvs.update({ value: value }, { where: { guild: guild.id, key: key } });
				return `Key [${key}] has been updated to [${value}]`;
			}
			catch (e) {
				console.log(e);
				return `Error setting key [${key}] to [${value}]`;
			}
		}
	}
};

exports.delete = async function(guild, key) {
	try {
		db.kvs.destroy({
			where: {
				guild: guild.id,
				key: key,
			},
		});
		return `Deleted key [${key}]`;
	}
	catch (e) {
		console.log(e);
		return `Error deleting key [${key}]`;
	}
};