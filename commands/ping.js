const { ALLOWEDCHANNELS } = require('../util/channels');
const { ADMINISTRATOR, OPERATOR, PREMIUM, STANDARD } = require('../util/permissions');

module.exports = {
	name: 'ping',
	description: 'Pings the bot.',
	permission: ADMINISTRATOR | OPERATOR | PREMIUM | STANDARD,
	channel: ALLOWEDCHANNELS,
	execute(teambot, message) {
		message.channel.send('Pong.');
	},
};