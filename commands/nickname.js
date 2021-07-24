const { ADMINISTRATOR } = require('../util/permissions');
const { ALL } = require('../util/channels');
module.exports = {
	name: 'nickname',
	aliases: ['nick'],
	description: 'Sets nicknames',
	permission: ADMINISTRATOR,
	channel: ALL,
	execute(teambot, message, args) {
		if (args.length) {
			const nick = args.join(' ');
			const guildId = message.guild.id;
			const guild = teambot.bot.guilds.cache.get(guildId);
			guild.me.setNickname(nick);
			return message.reply(`Bot nick has been set to ${nick}`);

		}
	},
};
