const { ADMINISTRATOR, OPERATOR, PREMIUM, STANDARD } = require('../util/permissions');
const got = require('got');
const { Op } = require('sequelize');
const moment = require('moment-timezone');

module.exports = {
	name: 'stonks',
	aliases: ['stocks', 'stock'],
	description: 'Provides a stock market game. Buy and sell your stocks on paper, but in Discord.',
	args: true,
	usage: 'buy <ticker> [<amount>|max] | sell <ticker> <amount> | holdings | scores (teamshape only) | liquidate',
	permission: ADMINISTRATOR | OPERATOR | PREMIUM | STANDARD,
	async execute(teambot, message, args) {

		// Set market open and close times.
		const marketOpen = moment().tz('Australia/Sydney').set({ 'hour': 10, 'minute': 00 });
		const marketClose = moment().tz('Australia/Sydney').set({ 'hour': 16, 'minute': 10 });
		const weekend = (moment().day() === 0 || moment().day() === 7);

		// Load user sending the command and user being acted upon.
		const commandUser = message.author.id;
		const guild = message.guild.id;
		let loadedCommandUser = [];
		let asx = '';

		try {
			loadedCommandUser = await teambot.db.users.findOne({
				include: [
					{
						model: teambot.db.holdings,
					},
				],
				where: {
					guild: guild,
					user: commandUser,
				},
			});
		}
		catch (e) {
			return message.reply('Something went wrong with finding your user.');
		}

		if (args[0] === 'buy') {
			if (!moment().tz('Australia/Sydney').isBetween(marketOpen, marketClose) || weekend) {
				return message.reply('You can\'t trade while the market is closed.');
			}

			if (args[2] === 'undefined') {
				return message.reply('Please add a ticker and the number of shares.');
			}
			const ticker = args[1].toUpperCase();
			let shares = args[2];
			const dollars = Number(loadedCommandUser.dataValues.dollars);

			// Check the stock exists and calculate the price.
			try {
				asx = await got.get('https://www.asx.com.au/asx/1/share/' + ticker).json();
			}
			catch (error) {
				return message.reply('Stock not found.');
			}
			// Sometimes the API returns results without price information.
			if (!asx.last_price) {
				return message.reply('No price information available.');
			}

			// if shares is 'max' work out the maximum that can be purchased by dividing the total balance by the price.
			if (shares === 'max') {
				shares = Math.floor(dollars / asx.last_price);
			}
			else {
				shares = Number(shares);
			}

			if (!Number.isInteger(shares)) {
				return message.reply('This is not a number.');
			}

			const totalPrice = +(asx.last_price * shares).toFixed(2);

			if (totalPrice === 0) {
				return message.reply('Please buy more of that. Minimum purchase is 1 cent.');
			}

			// Check if the user has this many dollars in their account.
			if (dollars < totalPrice) {
				return message.reply(`You don't have that much money. You only have $${dollars}`);
			}

			// Log the transaction and update the user's balance.
			try {
				await teambot.db.log.create({
					guild: guild,
					userId: message.author.id,
					message: `Bought ${shares} of ${ticker}`,
					buy: 1,
					ticker: ticker,
					amount: shares,
					executed: 0,
				});

				return message.reply(`You have queued the buy of ${shares} of ${ticker}.`);
			}
			catch (e) {
				return message.reply('Something went wrong with buying these stocks.');
			}
		}
		else if (args[0] === 'sell') {
			if (!moment().tz('Australia/Sydney').isBetween(marketOpen, marketClose) || weekend) {
				return message.reply('You can\'t trade while the market is closed.');
			}
			if (args[2] === 'undefined') {
				return message.reply('Please add a ticker and a dollar value of shares.');
			}
			const ticker = args[1].toUpperCase();
			const shares = Number(args[2]);

			if (!Number.isInteger(shares)) {
				return message.reply('This is not a number.');
			}

			// Check the stock exists.
			try {
				asx = await got.get('https://www.asx.com.au/asx/1/share/' + ticker).json();
			}
			catch (error) {
				return message.reply('Stock not found.');
			}
			// Sometimes the API returns results without price information.
			if (!asx.last_price) {
				return message.reply('No price information available.');
			}

			// Does the user hold the stock?
			const heldStock = loadedCommandUser.dataValues.holdings.find(element => element.ticker === ticker);
			if (!heldStock) {
				return message.reply('You do not own this stock.');
			}

			if (moment(heldStock.dataValues.updatedAt).tz('Australia/Sydney').add(30, 'minutes') > moment().tz('Australia/Sydney')) {
				return message.reply('You must hold a stock for at least 30 minutes before selling.');
			}

			// Check the user has more than they want to get rid of.
			if (shares > Number(heldStock.dataValues.amount)) {
				return message.reply(`You do not own enough of ${ticker}. You own ${heldStock.dataValues.amount} units.`);
			}

			try {
				await teambot.db.log.create({
					guild: guild,
					userId: message.author.id,
					message: `Sold ${shares} of ${ticker}`,
					sell: 1,
					ticker: ticker,
					amount: shares,
					executed: 0,
				});
				return message.reply(`You have queued the sale of ${shares} of ${ticker}.`);
			}
			catch (error) {
				return message.reply('Something went wrong queueing this stock for sale');
			}
		}
		else if (args[0] === 'holdings') {
			const data = [];
			data.push('Your holdings:');

			const holdings = loadedCommandUser.dataValues.holdings;

			const lookUp = async () => {
				let userBalance = Number(loadedCommandUser.dataValues.dollars);

				for (const h of holdings) {
					if (h.amount == 0) {
						continue;
					}
					asx = await got.get('https://www.asx.com.au/asx/1/share/' + h.dataValues.ticker).json();
					const stockPrice = +(asx.last_price * h.dataValues.amount).toFixed(2);
					data.push(`${h.ticker}: ${h.amount} at $${stockPrice}`);
					userBalance += stockPrice;
				}
				return Number(userBalance).toFixed(2);
			};

			const userBalance = await lookUp();

			data.push(`Your bank balance: $${loadedCommandUser.dataValues.dollars}`);
			data.push(`Your total balance: $${userBalance}`);

			return message.reply(data, { split: true });
		}
		else if (args[0] === 'scores') {
			if (teambot.permissions.isAdmin(loadedCommandUser.dataValues.permission)) {
				try {
					const allUsers = await teambot.db.users.findAll({
						include: [
							{
								model: teambot.db.holdings,
							},
						],
						where: {
							guild: guild,
							dollars: {
								[Op.ne]: 50000,
							},
						},
					});

					const scores = [];
					const data = [];

					for (const u of allUsers) {
						const holdings = u.dataValues.holdings;

						const lookUp = async () => {
							let userBalance = Number(u.dollars);

							for (const h of holdings) {
								if (h.amount == 0) {
									continue;
								}
								try {
									asx = await got.get('https://www.asx.com.au/asx/1/share/' + h.dataValues.ticker).json();
									const stockPrice = +(asx.last_price * h.dataValues.amount).toFixed(2);
									userBalance += stockPrice;
								}
								catch(error) {
									console.log(error);
									console.log(`Error with ${h.dataValues.ticker} for ${u.user}.`);
								}
							}
							return Number(userBalance).toFixed(2);
						};

						const userBalance = await lookUp();
						const userId = u.user;
						scores.push({ userId, userBalance });

					}

					scores.sort((a, b) => {
						return b.userBalance - a.userBalance;
					});


					data.push('Total balances for all playing users:\n');
					scores.forEach((s) => {
						data.push(`<@${s.userId}>: $${s.userBalance}`);
					});
					return message.reply(data, { split: true });

				}
				catch (error) {
					console.log(error);
				}
			}
		}
		else if (args[0] === 'liquidate') {
			if (!moment().tz('Australia/Sydney').isBetween(marketOpen, marketClose) || weekend) {
				return message.reply('You can\'t trade while the market is closed.');
			}

			const data = [];

			const holdings = loadedCommandUser.dataValues.holdings;

			for (const h of holdings) {
				if (h.amount == 0) {
					continue;
				}
				try {
					asx = await got.get('https://www.asx.com.au/asx/1/share/' + h.dataValues.ticker).json();
				}
				catch (error) {
					return message.reply(`Stock not found ${h.dataValues.ticker}.`);
				}

				// Sometimes the API returns results without price information.
				if (!asx.last_price) {
					return message.reply(`No price information available for ${h.dataValues.ticker}.`);
				}

				if (moment(h.dataValues.updatedAt).tz('Australia/Sydney').add(30, 'minutes') > moment().tz('Australia/Sydney')) {
					return message.reply(`You must hold a stock for at least 30 minutes before selling (${h.dataValues.ticker}).`);
				}

				try {
					await teambot.db.log.create({
						guild: guild,
						userId: message.author.id,
						message: `Sold ${h.dataValues.amount} of ${h.dataValues.ticker}`,
						sell: 1,
						ticker: h.dataValues.ticker,
						amount: h.dataValues.amount,
						executed: 0,
					});
					data.push(`You have queued the sale of ${h.dataValues.amount} of ${h.dataValues.ticker}.`);
				}
				catch (error) {
					console.log(error);
					data.push(`Something went wrong queueing ${h.dataValues.ticker} for sale`);
				}
			}

			return message.reply(data, { split: true });
		}
	},
};
