const human = require('interval-to-human');
const { ADMINISTRATOR, OPERATOR, PREMIUM, STANDARD } = require("../permissions");
module.exports = {
	name: 'uptime',
	description: 'Gets the bot uptime.',
	permission: ADMINISTRATOR | OPERATOR | PREMIUM | STANDARD,
	execute(teambot, message) {
		const uptime = human(message.client.uptime);
		return message.channel.send(`Online for ${uptime}.`);
	},
};