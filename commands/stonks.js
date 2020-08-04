const { ADMINISTRATOR, OPERATOR, PREMIUM, STANDARD } = require('../permissions');
const got = require('got');
const { Op } = require('sequelize');

module.exports = {
	name: 'stonks',
	aliases: ['stocks'],
	description: 'Provides a stock market game. Buy and sell your stocks on paper, but in Discord.',
	args: true,
	usage: 'buy <ticker> <amount> | sell <ticker> <amount> | holdings | score',
	permission: ADMINISTRATOR | OPERATOR | PREMIUM | STANDARD,
	async execute(teambot, message, args) {

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
			if (args[2] === 'undefined') {
				return message.reply('Please add a ticker and the number of shares.');
			}
			const ticker = args[1];
			const shares = Number(args[2]);
			const dollars = Number(loadedCommandUser.dataValues.dollars);

			if (!Number.isInteger(shares)) {
				return message.reply('This is not a number.');
			}

			// Check the stock exists and calculate the price.
			try {
				asx = await got.get('https://www.asx.com.au/asx/1/share/' + ticker).json();
			}
			catch (error) {
				return message.reply('Stock not found.');
			}

			// @TODO round totalPrice to 2DP.
			const totalPrice = +(asx.last_price * shares).toFixed(2);

			// Check if the user has this many dollars in their account.
			if (dollars < totalPrice) {
				return message.reply(`You don't have that much money. You only have $${dollars}`);
			}

			// Add the shares to their holdings and remove the dollars from their account.
			const heldStock = loadedCommandUser.dataValues.holdings.find(element => element.ticker === ticker);
			if (!heldStock) {
				// User doesn't have the stock so create a new holding.
				try {
					// Does the user already have this stock?
					await teambot.db.holdings.create({
						guild: guild,
						userId: message.author.id,
						ticker: ticker,
						amount: shares,
					});
				}
				catch (e) {
					return message.reply('Something went wrong with buying these stocks.');
				}
			}
			else {
				// User has the stock so update their holding
				const newAmount = heldStock.dataValues.amount + shares;
				await teambot.db.holdings.update({ amount: newAmount }, { where: { userId: message.author.id, ticker: ticker } });
			}

			// Log the transaction and update the user's balance.
			try {
				await teambot.db.log.create({
					guild: guild,
					userId: message.author.id,
					message: `Bought ${shares} of ${ticker}`,
				});

				// @TODO round balance to 2DP.
				const balance = +(dollars - totalPrice).toFixed(2);
				await teambot.db.users.update({ dollars: balance }, { where: { id: loadedCommandUser.dataValues.id } });
				return message.reply(`You bought ${shares} of ${ticker} at ${asx.last_price} for ${totalPrice}. Your new balance is $${balance}`);
			}
			catch (e) {
				return message.reply('Something went wrong with buying these stocks.');
			}
		}
		else if (args[0] === 'sell') {
			if (args[2] === 'undefined') {
				return message.reply('Please add a ticker and a dollar value of shares.');
			}
			const ticker = args[1];
			const shares = Number(args[2]);
			const dollars = Number(loadedCommandUser.dataValues.dollars);

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

			// Does the user hold the stock?
			const heldStock = loadedCommandUser.dataValues.holdings.find(element => element.ticker === ticker);
			if (!heldStock) {
				return message.reply('You do not own this stock.');
			}

			// Check the user has more than they want to get rid of.
			if (shares > Number(heldStock.dataValues.amount)) {
				return message.reply(`You do not own enough of ${ticker}. You own ${heldStock.dataValues.amount} units.`);
			}

			// Remove the shares from the user and update their account.
			const totalPrice = +(asx.last_price * shares).toFixed(2);
			const balance = +(dollars + totalPrice).toFixed(2);
			const newAmount = +(heldStock.dataValues.amount - shares).toFixed(2);

			try {
				await teambot.db.holdings.update({ amount: newAmount }, { where: { userId: message.author.id, ticker: ticker } });
				await teambot.db.users.update({ dollars: balance }, { where: { id: loadedCommandUser.dataValues.id } });
				return message.reply(`You sold ${shares} of ${ticker} at ${asx.last_price} for ${totalPrice}. Your new balance is $${balance}`);
			}
			catch (error) {
				return message.reply('Something went wrong selling this stock');
			}
		}
		else if (args[0] === 'holdings') {
			const data = [];
			data.push('Your holdings:');

			const holdings = loadedCommandUser.dataValues.holdings;

			const lookUp = async () => {
				let userBalance = Number(loadedCommandUser.dataValues.dollars);

				for (const h of holdings) {
					asx = await got.get('https://www.asx.com.au/asx/1/share/' + h.dataValues.ticker).json();
					const stockPrice = +(asx.last_price * h.dataValues.amount).toFixed(2);
					data.push(`${h.ticker}: ${h.amount} at $${stockPrice}`);
					userBalance += stockPrice;
				}
				return userBalance;
			};

			const userBalance = await lookUp();

			data.push(`Your bank balance: $${loadedCommandUser.dataValues.dollars}`);
			data.push(`Your total balance: $${userBalance}`);

			return message.reply(data, { split: true });
		}
		else if (args[0] === 'scores') {
			if (teambot.permissions.isMod(loadedCommandUser.dataValues.permission)) {
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
								asx = await got.get('https://www.asx.com.au/asx/1/share/' + h.dataValues.ticker).json();
								const stockPrice = +(asx.last_price * h.dataValues.amount).toFixed(2);
								userBalance += stockPrice;
							}
							return userBalance;
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
	},
};