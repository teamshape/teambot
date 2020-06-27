module.exports = {
	name: 'ping',
	description: 'Pings the bot.',
	execute(db, message) {
		message.channel.send('Pong.');
	},
};