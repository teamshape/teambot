const Sequelize = require('sequelize');

exports.sequelize = new Sequelize('database', null, null, {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'db/teambot.sqlite',
});

exports.RemindDB = exports.sequelize.define('reminders', {
	id: {
		type: Sequelize.INTEGER,
		unique: true,
		primaryKey: true,
	},
	guild: Sequelize.STRING,
	channel: Sequelize.STRING,
	reminder_timestamp: {
		type: Sequelize.DATE,
	},
	user: Sequelize.STRING,
	reminder: Sequelize.STRING,
});

exports.AlertDB = exports.sequelize.define('alerts', {
	id: {
		type: Sequelize.INTEGER,
		unique: true,
		primaryKey: true,
	},
	guild: Sequelize.STRING,
	channel: Sequelize.STRING,
	user: Sequelize.STRING,
	stock: Sequelize.STRING,
	operator: Sequelize.STRING,
	price: Sequelize.STRING,
	status: Sequelize.BOOLEAN,
});

exports.UserDB = exports.sequelize.define('users', {
	id: {
		type: Sequelize.INTEGER,
		unique: true,
		primaryKey: true,
	},
	guild: Sequelize.STRING,
	user: Sequelize.STRING,
	permission: {
		type: Sequelize.INTEGER,
	},
},
{
	indexes: [
		{
			unique: true,
			fields: ['user', 'guild'],
		},
	],
});

exports.KarmaDB = exports.sequelize.define('karma', {
	id: {
		type: Sequelize.INTEGER,
		unique: true,
		primaryKey: true,
	},
	guild: Sequelize.STRING,
	user: {
		type: Sequelize.STRING,
		unique: true,
	},
	score: Sequelize.INTEGER,
	karma: Sequelize.INTEGER,
});

exports.WelcomeDB = exports.sequelize.define('welcome', {
	id: {
		type: Sequelize.INTEGER,
		unique: true,
		primaryKey: true,
	},
	guild: Sequelize.STRING,
	user: Sequelize.STRING,
	welcome: {
		type: Sequelize.STRING,
		unique: true,
	},
});

exports.BotlineDB = exports.sequelize.define('botline', {
	id: {
		type: Sequelize.INTEGER,
		unique: true,
		primaryKey: true,
	},
	guild: Sequelize.STRING,
	user: Sequelize.STRING,
	botline: {
		type: Sequelize.STRING,
		unique: true,
	},
});

exports.KvDB = exports.sequelize.define('kv', {
	guild: Sequelize.STRING,
	key: Sequelize.STRING,
	value: Sequelize.STRING,
},
{
	indexes: [
		{
			unique: true,
			fields: ['key', 'guild'],
		},
	],
});

exports.ChatDB = exports.sequelize.define('chat', {
	id: {
		type: Sequelize.INTEGER,
		unique: true,
		primaryKey: true,
	},
	messageId: {
		type: Sequelize.INTEGER,
		unique: true,
	},
	guild: Sequelize.INTEGER,
	channel: Sequelize.INTEGER,
	user: Sequelize.INTEGER,
	chatline: Sequelize.STRING,
	deleted: Sequelize.BOOLEAN,
	edited: Sequelize.BOOLEAN,
},
{
	indexes: [
		{
			fields: ['guild', 'channel'],
		},
		{
			fields: ['guild', 'user'],
		},
	],
});

exports.RemindDB.sync();
exports.AlertDB.sync();
exports.UserDB.sync();
exports.KarmaDB.sync();
exports.WelcomeDB.sync();
exports.BotlineDB.sync();
exports.KvDB.sync();
exports.ChatDB.sync();
