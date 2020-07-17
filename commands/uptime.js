const human = require('interval-to-human');
module.exports = {
	name: 'uptime',
	description: 'Gets the bot uptime.',
	execute(teambot, message) {
		const uptime = human(message.client.uptime);
		return message.channel.send(`Online for ${uptime}.`);
	},
};