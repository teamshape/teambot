const { ADMINISTRATOR, OPERATOR, PREMIUM } = require('../permissions');

module.exports = {
	name: 'botmanage',
	aliases: ['bot'],
	description: 'Handles bot management',
	args: true,
	usage: 'addwelcome <welcome> | getwelcomes | deletewelcome <id> | addbotline <botline> | getbotlines | deletebotline <id>',
	permission: ADMINISTRATOR | OPERATOR | PREMIUM,
	async execute(teambot, message, args) {

		// Load user sending the command and user being acted upon.
		const commandUser = message.author.id;
		const guild = message.guild.id;

		if (args[0] === 'addwelcome') {

			if (teambot.permissions.isTrusted(teambot.user.dataValues.permission)) {
				const welcome = args.slice(1).join(' ');

				try {
					await teambot.db.welcomes.create({
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
				// return message.reply('Your permissions are not high enough to manage the bot, you must construct additional pylons.');
			}
		}
		else if (args[0] === 'getwelcomes') {
			const welcomes = await teambot.db.welcomes.findAll();
			const data = [];
			data.push('Here\'s a list of all welcomes:');
			data.push(welcomes.map(welcome => `${welcome.id}: ${welcome.welcome}`).join('\n'));

			return message.author.send(data, { split: true })
				.then(() => {
					if (message.channel.type === 'dm') return;
					message.reply('I\'ve sent you a DM with all my commands!');
				})
				.catch(error => {
					console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
					message.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
				});
		}
		else if (args[0] === 'deletewelcome') {
			if (teambot.permissions.isMod(teambot.user.dataValues.permission) && !isNaN(args[1])) {
				teambot.db.welcomes.destroy({
					where: {
						id: args[1],
					},
				});
				message.reply(`Welcome #${args[1]} has been deleted.`);
			}
		}
		else if (args[0] === 'addbotline') {

			if (teambot.permissions.isTrusted(teambot.user.dataValues.permission)) {
				const botline = args.slice(1).join(' ');

				try {
					await teambot.db.botlines.create({
						guild: message.guild.id,
						user: message.author.id,
						botline: botline,
					});
					return message.reply('Added a new botline.');
				}
				catch (e) {
					if (e.name === 'SequelizeUniqueConstraintError') {
						return message.reply('That botline already exists.');
					}
					return message.reply('Something went wrong with adding a botline.');
				}

			}
			else {
				// return message.reply('Your permissions are not high enough to manage the bot, you must construct additional pylons.');
			}
		}
		else if (args[0] === 'getbotlines') {
			const botlines = await teambot.db.botlines.findAll();
			const data = [];
			data.push('Here\'s a list of all botlines:');
			data.push(botlines.map(botline => `${botline.id}: ${botline.botline}`).join('\n'));

			return message.author.send(data, { split: true })
				.then(() => {
					if (message.channel.type === 'dm') return;
					message.reply('I\'ve sent you a DM with all my commands!');
				})
				.catch(error => {
					console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
					message.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
				});
		}
		else if (args[0] === 'deletebotline') {
			if (teambot.permissions.isMod(teambot.user.dataValues.permission) && !isNaN(args[1])) {
				teambot.db.botlines.destroy({
					where: {
						id: args[1],
					},
				});
				message.reply(`Botline #${args[1]} has been deleted.`);
			}
		}
	},

};