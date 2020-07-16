module.exports = {
	name: 'ping',
	description: 'Pings the bot.',
	execute(teambot, message) {
		message.channel.send('Pong.');
	},
};