const pluralize = require('pluralize');
const { ALL } = require('../util/channels');
const { ADMINISTRATOR, OPERATOR, PREMIUM, STANDARD, PLEBIAN, DOUBLEPLEBIAN } = require('../util/permissions');

module.exports = {
	name: 'surprise',
	description: `Bet you won't use this command`,
	args: false,
	permission: ADMINISTRATOR | OPERATOR | PREMIUM | STANDARD | PLEBIAN | DOUBLEPLEBIAN,
	channel: ALL,
	execute(teambot, message) {
		const role = message.guild.roles.cache.find(role => role.name === "Shapecel");
		message.member.roles.add(role);
		return message.reply('Thank you for your service.');
	},
};