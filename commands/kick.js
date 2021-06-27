const { ALL } = require('../util/channels');
const { ADMINISTRATOR, OPERATOR, TRUSTED } = require('../util/permissions');

module.exports = {
	name: 'kick',
	description: 'Handles kicks for users',
	args: true,
	usage: '<@user> [Reason]',
	permission: ADMINISTRATOR | OPERATOR | TRUSTED,
	channel: ALL,
	async execute(teambot, message) {

		if (!message.member.hasPermission(['KICK_MEMBERS'])) {
			return;
		}

		const member = message.mentions.members.first();

		// @TODO Add reason and create embed.
		// if (!args[1]) {
		message.reply(`${member} has been kicked, lolbai.`);
		return member.kick();
		// }
	},
};