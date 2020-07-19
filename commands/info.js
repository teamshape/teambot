module.exports = {
	name: 'info',
	description: 'Gets user info.',
	async execute(teambot, message, args) {

		// Load user sending the command.
		const commandUser = message.author.id;
		const guild = message.guild.id;
		let loadedCommandUser = [];

		try {
			loadedCommandUser = await teambot.db.UserDB.findOne({ where: {
				guild: guild,
				user: commandUser,
			} });
		}
		catch (e) {
			return message.reply('Something went wrong with finding your user.');
		}

		const data = [];
		if (!args.length) {
			data.push('Here\'s your info:\n');
			data.push(`Your username is: ${message.author.username}`);
			data.push(`You joined on: ${loadedCommandUser.dataValues.createdAt}`);
			data.push(`Your permission # is: ${loadedCommandUser.dataValues.permission}`);

			return message.author.send(data, { split: true })
				.then(() => {
					if (message.channel.type === 'dm') return;
					message.reply('I\'ve sent you a DM with your info!');
				})
				.catch(error => {
					console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
					message.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
				});
		}
	},
};