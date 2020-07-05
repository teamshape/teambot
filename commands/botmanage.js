const { Sequelize } = require('sequelize');

module.exports = {
	name: 'botmanage',
	description: 'Handles bot management',
	args: true,
	usage: 'addwelcome <welcome>',
	async execute(db, message, args) {

		const ADMINISTRATOR = 64;
		const OPERATOR = 32;
		const PREMIUM = 16;
		const STANDARD = 8;
		const PLEBIAN = 4;
		const DOUBLEPLEBIAN = 2;
		const NOPERMS = 0;

		// Load user sending the command and user being acted upon.
		const commandUser = message.author.id;
		const guild = message.guild.id;

		let loadedCommandUser = [];

		try {
			loadedCommandUser = await db.UserDB.findOne({ where: {
				guild: guild,
				user: commandUser,
			} });
		}
		catch (e) {
			return message.reply('Something went wrong with finding your user.');
		}

		if (args[0] === 'addwelcome') {

			if (loadedCommandUser.dataValues.permission >= OPERATOR) {
				const welcome = args.slice(1).join(' ');

				try {
					await db.WelcomeDB.create({
						guild: message.guild.id,
						user: message.author.id,
						welcome: welcome,
					});
					return message.reply('Added a new welcome.');
				}
				catch (e) {
					if (e.name === 'SequelizeUniqueConstraintError') {
						return message.reply('That welcome already exists.');
					}
					return message.reply('Something went wrong with adding a welcome.');
				}

			}
			else {
				return message.reply('Your permissions are not high enough to manage the bot, you must construct additional pylons.');
			}
		}
		else if (args[0] === 'getwelcome') {
			const welcomes = await db.WelcomeDB.findOne({ order: Sequelize.literal('random()') });
			return message.reply(welcomes.dataValues.welcome);
		}
	},

};