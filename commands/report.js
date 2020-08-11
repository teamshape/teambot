const { ADMINISTRATOR, OPERATOR } = require('../util/permissions');

module.exports = {
	name: 'report',
	description: 'Reports users for rule breaking',
	args: true,
	usage: 'report <user>',
	permission: ADMINISTRATOR | OPERATOR,
	async execute(teambot, message) {

		const reported = message.mentions.users.first();

		console.log(reported);

		try {
			await teambot.db.reports.create({
				guild: message.guild.id,
				reporter: message.author.id,
				reported: reported.id,
			});
			return message.reply(`${reported} has been reported.`);
		}
		catch (e) {
			console.log(e);
			return message.reply('Something went wrong creating a report.');
		}
	},
};