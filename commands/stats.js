const { ADMINISTRATOR, OPERATOR, PREMIUM, STANDARD } = require("../permissions");
const human = require('interval-to-human');

module.exports = {
	name: 'stats',
	description: 'Gets server stats.',
	permission: ADMINISTRATOR | OPERATOR | PREMIUM | STANDARD,
	async execute(teambot, message) {

		const guildId = message.guild.id;
		const userCount = await teambot.db.users.count({ where: { guild: guildId } });
		const chatCount = await teambot.db.chats.count({ where: { guild: guildId } });
		const used = process.memoryUsage().heapUsed / 1024 / 1024;

		const guild = teambot.bot.guilds.cache.get(guildId);
		const roles = guild.roles.cache.size;
		const channels = guild.channels.cache.size;

		const data = [];
		data.push(`Uptime: ${human(message.client.uptime)}`);
		data.push(`Heap Memory: ${used.toFixed(2)} MB`);
		data.push(`Node: ${process.version}`);
		data.push(`Channels: ${channels}`);
		data.push(`Roles: ${roles}`);
		data.push(`Commands: ${message.client.commands.size}`);
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