const dateparser = require('dateparser');
const { ADMINISTRATOR, OPERATOR, PREMIUM, STANDARD } = require("../permissions");

module.exports = {
	name: 'remindme',
	aliases: ['remind'],
	description: 'Reminds users to do a thing they wanted reminding of.',
	args: true,
	usage: 'in <time> to <do something>',
	permission: ADMINISTRATOR | OPERATOR | PREMIUM | STANDARD,
	async execute(teambot, message, args) {
		// !remind me in {time increments} to {message}
		const myMessage = args.slice(1).join(' ').split(/ to (.+)?/, 2);
		const timestamp = Date.now() + dateparser.parse(myMessage[0]).value;
		const reminder = myMessage[1];

		try {
			await teambot.db.reminders.create({
				guild: message.guild.id,
				channel: message.channel.id,
				reminder_timestamp: timestamp,
				user: message.author.id,
				reminder: reminder,
			});
			return message.reply('Reminder added.');
		}
		catch (e) {
			if (e.name === 'SequelizeUniqueConstraintError') {
				return message.reply('That reminder already exists.');
			}
			return message.reply('Something went wrong with adding a reminder.');
		}
	},
};