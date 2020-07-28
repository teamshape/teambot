module.exports = {
	name: 'karma',
	description: 'Shows the karma list.',
	async execute(teambot, message) {

		const data = [];

		data.push('Here\'s the karma list:');

		const karmas = await teambot.db.karmas.findAll({
			order: [
				['karma', 'DESC'],
			],
		});

		karmas.forEach(function(k) {
			const member = k.dataValues.user;
			const karma = k.dataValues.karma;

			data.push(`<@!${member}>: ${karma}`);
		});

		return message.author.send(data, { split: true })
			.then(() => {
				if (message.channel.type === 'dm') return;
				message.reply('I\'ve sent you a DM with the karma list!');
			})
			.catch(error => {
				console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
				message.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
			});
	},
};