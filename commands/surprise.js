const pluralize = require('pluralize');
const { ALL } = require('../util/channels');
const { ADMINISTRATOR, OPERATOR, TRUSTED, PREMIUM, STANDARD, PLEBIAN } = require('../util/permissions');

module.exports = {
	name: 'surprise',
	description: `Bet you won't use this command`,
	args: false,
	permission: ADMINISTRATOR | OPERATOR | TRUSTED | PREMIUM | STANDARD | PLEBIAN,
	channel: ALL,
	execute(teambot, message) {
		const role = message.guild.roles.cache.find(role => role.name === "Shapecel");
		message.member.roles.add(role);
		return message.reply('Thank you for your service.');
	},
};