const dateparser = require('dateparser');
const moment = require('moment-timezone');
const { ALL } = require('../util/channels');
const { ADMINISTRATOR, OPERATOR, PREMIUM } = require('../util/permissions');

module.exports = {
	name: 'ban',
	description: 'Handles bans for users',
	args: true,
	usage: '<@user> [time]',
	permission: ADMINISTRATOR | OPERATOR,
	channel: ALL,
	async execute(teambot, message, args) {

		if (!message.member.hasPermission(['BAN_MEMBERS'])) {
			return;
		}

		const user = message.mentions.users.first();
		const guildId = message.guild.id;
		const guild = teambot.bot.guilds.cache.get(guildId);

		if (!args[1]) {
			return guild.members.ban(user);
		}
		else {
			const banTime = args.slice(1).join(' ').split(/ to (.+)?/, 2);
			const banTimestamp = Date.now() + dateparser.parse(banTime[0]).value;
			const banDate = moment(banTimestamp, 'x').tz('Australia/Sydney').format();

			try {
				await teambot.db.bans.create({
					guild: guildId,
					channel: message.channel.id,
					moderator: message.author.id,
					user: user.id,
					banDate: banDate
				});
				guild.members.ban(user);
				return message.reply(`${user} has been banned until ${banDate}.`);
			}
			catch (e) {
				console.log(e);
				return message.reply('Something went wrong adding this ban.');
			}
		}
	},
};