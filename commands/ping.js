const { ALLOWEDCHANNELS } = require('../util/channels');
const { ADMINISTRATOR, OPERATOR, TRUSTED, PREMIUM, STANDARD } = require('../util/permissions');

module.exports = {
	name: 'ping',
	description: 'Pings the bot.',
	permission: ADMINISTRATOR | OPERATOR | TRUSTED | PREMIUM | STANDARD,
	channel: ALLOWEDCHANNELS,
	execute(teambot, message) {
		message.channel.send('Pong.');
	},
};