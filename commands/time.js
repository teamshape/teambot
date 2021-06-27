const { ADMINISTRATOR, OPERATOR, TRUSTED, PREMIUM, STANDARD } = require('../util/permissions');
const moment = require('moment-timezone');
const { BOTCHANNEL } = require('../util/channels');

module.exports = {
	name: 'time',
	description: 'Shows time and date information (usually for debugging timezones).',
	args: false,
	usage: 'time',
	permission: ADMINISTRATOR | OPERATOR | TRUSTED | PREMIUM | STANDARD,
	channel: BOTCHANNEL,
	async execute(teambot, message) {

		const local = moment().format();
		const aus = moment().tz('Australia/Sydney').format();

		const data = [];
		data.push('Let\'s look up some times!');
		data.push(`Server time: ${local}.`);
		data.push(`Australia time: ${aus}.`);

		return message.reply(data, { split: true });
	},
};
