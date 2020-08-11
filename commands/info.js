const permissions = require('../util/permissions');
const moment = require('moment-timezone');
module.exports = {
	name: 'info',
	description: 'Gets user info.',
	permission: permissions.ADMINISTRATOR | permissions.OPERATOR | permissions.PREMIUM | permissions.STANDARD,
	async execute(teambot, message, args) {

		const data = [];
		const permissionName = Object.keys(permissions).find(key => permissions[key] === teambot.user.dataValues.permission);

		if (!args.length) {
			data.push('Here\'s your info:\n');
			data.push(`Your username is: ${message.author.username}`);
			data.push(`You joined on: ${teambot.user.dataValues.createdAt}, which means you've been a member for about ${moment(teambot.user.dataValues.createdAt).fromNow(true).format()}`);
			data.push(`You've got $${teambot.user.dataValues.dollars} dollars in your account.`);
			data.push(`Your permission # is: ${teambot.user.dataValues.permission} (${permissionName})`);

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