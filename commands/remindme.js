const dateparser = require('dateparser');

module.exports = {
	name: 'remindme',
	description: 'Reminds users to do a thing they wanted reminding of.',
	args: true,
	usage: 'in <time> to <do something>',
	async execute(db, message, args) {
		// !remind me in {time increments} to {message}
		const myMessage = args.slice(1).join(' ').split(/ to (.+)?/, 2);
		const timestamp = Date.now() + dateparser.parse(myMessage[0]).value;
		const reminder = myMessage[1];

		try {
			await db.RemindDB.create({
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