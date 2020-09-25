const human = require('interval-to-human');
const { ALLOWEDCHANNELS } = require('../util/channels');
const { ADMINISTRATOR, OPERATOR, PREMIUM, STANDARD } = require('../util/permissions');
module.exports = {
	name: 'uptime',
	description: 'Gets the bot uptime.',
	permission: ADMINISTRATOR | OPERATOR | PREMIUM | STANDARD,
	channel: ALLOWEDCHANNELS,
	execute(teambot, message) {
		const uptime = human(message.client.uptime);
		return message.channel.send(`Online for ${uptime}.`);
	},
};