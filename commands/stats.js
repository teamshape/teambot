const { ADMINISTRATOR, OPERATOR, PREMIUM} = require('../permissions');
const human = require('interval-to-human');

module.exports = {
	name: 'stats',
	description: 'Gets server stats.',
	permission: ADMINISTRATOR | OPERATOR | PREMIUM,
	async execute(teambot, message) {

		const userCount = await teambot.db.UserDB.count({ where: { guild: message.guild.id } });
		const chatCount = await teambot.db.ChatDB.count({ where: { guild: message.guild.id } });
		const used = process.memoryUsage().heapUsed / 1024 / 1024;

		// const channels = teambot.bot.channels.cache.size;
		// const roles = teambot.bot.guilds.cache;
		// console.log(roles);
		// console.log(channels);

		const data = [];
		data.push(`Uptime: ${human(message.client.uptime)}`);
		data.push(`Heap Memory: ${used}`);
		data.push(`Commands: ${message.client.commands.size}`)
		data.push(`User count: ${userCount}`);
		data.push(`Chat lines: ${chatCount}`);

		return message.author.send(data, { split: true })
			.then(() => {
				if (message.channel.type === 'dm') return;
				message.reply('I\'ve sent you a DM with the server stats!');
			})
			.catch(error => {
				console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
				message.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
			});
	},
};