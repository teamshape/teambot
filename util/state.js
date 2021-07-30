const db = require('../models/index');

exports.get = async function(guild, key) {
	try {
		const dbValue = await db.kvs.findOne({ where: {
			guild: guild.id,
			key: key,
		} });
		if (dbValue) {
			return dbValue.dataValues.value;
		}
		return false;
	}
	catch (e) {
		console.log(e);
		return false;
	}
};

exports.set = async function(guild, key, value) {
	try {
		await db.kvs.create({
			guild: guild.id,
			key: key,
			value: value,
		});
		return true;
	}
	catch (error) {
		if (error.name === 'SequelizeUniqueConstraintError') {
			try {
				await db.kvs.update({ value: value }, { where: { guild: guild.id, key: key } });
				return true;
			}
			catch (e) {
				console.log(e);
				return false;
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
		return true;
	}
	catch (e) {
		console.log(e);
		return false;
	}
};