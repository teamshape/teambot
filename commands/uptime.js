const human = require('interval-to-human');
module.exports = {
	name: 'uptime',
	description: 'Gets the bot uptime.',
	execute(db, message) {
		const uptime = human(message.client.uptime);
		return message.channel.send(`Online for ${uptime}.`);
	},
};