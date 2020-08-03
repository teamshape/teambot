const { ADMINISTRATOR, OPERATOR, PREMIUM, STANDARD } = require('../permissions');

module.exports = {
	name: 'ping',
	description: 'Pings the bot.',
	permission: ADMINISTRATOR | OPERATOR | PREMIUM | STANDARD,
	execute(teambot, message) {
		message.channel.send('Pong.');
	},
};