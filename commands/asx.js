const { ADMINISTRATOR, OPERATOR, PREMIUM, STANDARD } = require('../util/permissions');
const moment = require('moment-timezone');

module.exports = {
	name: 'asx',
	aliases: ['asxgame', 'rocket'],
	description: 'Provides a stock market game. One entry per person per month with all entries locked on the last day of the month prior.',
	args: true,
	usage: 'add <ticker> | remove | list <current|next>',
	permission: ADMINISTRATOR | OPERATOR | PREMIUM | STANDARD,
	async execute(teambot, message, args) {

		// Load user sending the command and user being acted upon.
		const guild = message.guild.id;
		const thisMonth = moment().format('MMMM YYYY');
		const nextMonth = moment().add(1, 'months').format('MMMM YYYY');
		let asx = '';

		if (args[0] === 'add') {
			if (args[1] === 'undefined') {
				return message.reply('Please add a ticker.');
			}
			const ticker = args[1];

			try {
				await teambot.db.asx.create({
					guild: guild,
					user: message.author.id,
					ticker: ticker,
					date: nextMonth,
				});
				return message.reply(`Added a new entry for the ${nextMonth} game.`);
			}
			catch (e) {
				if (e.name === 'SequelizeUniqueConstraintError') {
					return message.reply('Either someone already picked that ticker, or you\'ve already entered next month\'s contest. Use the remove command to add a new one.');
				}
				return message.reply('Something went wrong with adding an entry.');
			}
		}
		else if (args[0] === 'remove') {
			teambot.db.asx.destroy({
				where: {
					guild: guild,
					user: message.author.id,
					date: nextMonth,
				},
			});
			return message.reply('If you had a ticker in next month\'s game, you don\'t anymore.');

		}
		else if (args[0] === 'list') {
			let entrants = [];
			const data = [];
			if (args[1] === 'current') {
				try {
					entrants = await teambot.db.asx.findAll({ where: {
						guild: guild,
						date: thisMonth,
					} });
				}
				catch (e) {
					return message.reply('Something went wrong with finding your user.');
				}
			}
			else if (args[1] === 'next') {
				try {
					entrants = await teambot.db.asx.findAll({ where: {
						guild: guild,
						date: nextMonth,
					} });
				}
				catch (e) {
					return message.reply('Something went wrong with finding your user.');
				}
				data.push(`ASX Bets game: ${nextMonth}`);
				data.push(entrants.map(entrant => `<@${entrant.user}>: ${entrant.ticker}`).join('\n'));
				return message.reply(data, { split: true });
			}
			else {
				return message.reply('Please use either list current or list next.');
			}
		}
	},
};