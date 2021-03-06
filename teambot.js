'use strict';
const timerStart = Date.now();

const fs = require('fs');
const got = require('got');
const moment = require('moment-timezone');
const { Client, Collection, Intents, MessageAttachment, MessageEmbed } = require('discord.js');
const { token, allowedChannels, botChannel, avApiKey, timer, prefix, auditChannel, client_id } = require('./config/teambot.json');
const { CronJob } = require('cron');
const { Sequelize, Op } = require('sequelize');
const AsyncLock = require('async-lock');
const pluralize = require('pluralize');
const { registerFont, createCanvas, loadImage } = require('canvas');
const lock = new AsyncLock();
const git = require('simple-git');
const pjson = require('./package.json');

// Set up the bot and its intents.
const bot = new Client();
// const bot = new Client({ ws: { intents: Intents.ALL } });

// Load local files to define required features for the bot.
const db = require('./models/index');
const permissions = require('./util/permissions');
const channels = require('./util/channels');

// Create global state for settings/flags.
let state = [];

const teambot = {
	db: db,
	permissions: permissions,
};

// Set up bot commands.
bot.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	bot.commands.set(command.name, command);
}

// Register the font once upfront.
registerFont('assets/Lato-Black.ttf', { family: 'Lato' });

// Load the bot.
bot.once('ready', async () => {
	const hash = await git().revparse([ '--short', 'HEAD']);
	const timerEnd = (Date.now() - timerStart) / 1000;
	console.log(`${bot.user.tag} v${pjson.version}#${hash} loaded in ${timerEnd} seconds!`);
	saySomething(`${bot.user.tag} v${pjson.version}#${hash} loaded in ${timerEnd} seconds!`);

	// Load keys and values into the state variable for use around TeamBot.
	const kv = await teambot.db.kvs.findAll();
	kv.forEach(async function(t) {
		const key = t.dataValues.key;
		const value = t.dataValues.value;
		state[key] = value;
		console.log(`[State] ${key} => ${value}`);
	});

	if (state.botname) {
		bot.user.setUsername(state.botname)
			.then(user => console.log(`Username set to ${state.botname}`))
			.catch(console.error);
        }
	else {
		bot.user.setUsername('TeamBot')
			.then(user => console.log(`Username set to ${user.username}`))
			.catch(console.error);
        }

	bot.user.setPresence({ activity: { name: 'all my stocks grow higher', type: 'WATCHING' }, status: 'online' })
		.then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
		.catch(console.error);

	// Reminder cron job that runs every minute.
	const job = new CronJob('0 * * * * *', async function() {
		const reminders = await teambot.db.reminders.findAll({ where: {
			reminder_timestamp: {
				[Op.lte]: Date.now(),
			},
		} });

		// Take all loaded reminders and send to the channel/user that registered it.
		reminders.forEach(function(rm) {
			const reminder_channel = bot.channels.cache.get(rm.dataValues.channel);
			const member = rm.dataValues.user;
			const reminder_message = rm.dataValues.reminder;
			if (reminder_channel) {
				reminder_channel.send(`<@${member}>: ${reminder_message}`);
				teambot.db.reminders.destroy({
					where: {
						id: rm.dataValues.id,
					},
				});
			}
		});

		// Also work through temporary bans to remove bans if they have expired.
		const bans = await teambot.db.bans.findAll({ where: {
			banDate: {
				[Op.lte]: Date.now(),
			},
		} });

		// Take all loaded bans and remove them/unban the user.
		bans.forEach(async function(b) {
			const guildId = b.dataValues.guild;
			const guild = bot.guilds.cache.get(guildId);
			try {
				teambot.db.bans.destroy({
					where: {
						id: b.dataValues.id,
					},
				});
				guild.members.unban(user);
				saySomething(`${user} has been unbanned.`);
			}
			catch (e) {
				console.log(e);
			}
		});
	}, null, true, 'Australia/Sydney');
	job.start();

	const marketMinuteJob = new CronJob('0 * 10-16 * * 1-5', async function() {
		// Cron job that runs every minute (during market hours) to alert of stock price movements.
		const alerts = await teambot.db.alerts.findAll();

		alerts.forEach(async function(a) {
			const member = a.dataValues.user;
			const stock = a.dataValues.stock;
			const operator = a.dataValues.operator;
			const price = a.dataValues.price;

			// @TODO look for a single function to call this API as we use it in other areas too.
			const asx = await got.get('https://www.asx.com.au/asx/1/share/' + stock).json();

			if (operator === '>' && asx.last_price >= price) {
				saySomething(`<@${member}>: ${stock} rose to/above your alert price of ${price} and is now trading at ${asx.last_price}`);
				teambot.db.alerts.destroy({
					where: {
						id: a.dataValues.id,
					},
				});
			}
			else if (operator === '<' && asx.last_price <= price) {
				saySomething(`<@${member}>: ${stock} dropped to/below your alert price of ${price} and is now trading at ${asx.last_price}`);
				teambot.db.alerts.destroy({
					where: {
						id: a.dataValues.id,
					},
				});
			}
		});

		// Cron job that runs every minute (during market hours) to execute trades created by stocks command/game.
		let logsToProcess = [];
		try {
			logsToProcess = await teambot.db.log.findAll({
				attributes: ['id', 'userId', 'guild', 'ticker', 'amount', 'buy', 'sell', 'executed'],
				where: {
					createdAt: {
						[Op.lte]: moment().tz('Australia/Sydney').subtract(15, 'minutes').tz('UTC').format(),
					},
					executed: false,
				},
			});
		}
		catch (e) {
			console.log('Something went wrong with finding logs.');
		}

		for (const l of logsToProcess) {
			const id = l.dataValues.id;
			const guild = l.dataValues.guild;
			const user = l.dataValues.userId;
			const ticker = l.dataValues.ticker;
			const amount = Number(l.dataValues.amount);
			const buy = l.dataValues.buy;
			const sell = l.dataValues.sell;

			let asx = [];
			try {
				asx = await got.get('https://www.asx.com.au/asx/1/share/' + ticker).json();
			}
			catch (error) {
				return console.log(`Stock not found (${ticker}).`);
			}
			// Sometimes the API returns results without price information.
			if (!asx.last_price) {
				console.log(`No price information available (${ticker}).`);
			}

			// Round totalPrice to 2DP.
			const totalPrice = +(asx.last_price * l.dataValues.amount).toFixed(2);

			// Load the user, their holdings, and their balance.
			let logProcessUser = [];
			try {
				logProcessUser = await teambot.db.users.findOne({
					include: [{ model: teambot.db.holdings }],
					where: { guild: guild, user: user },
				});

				// Store the user's current bank balance.
				const dollars = Number(logProcessUser.dataValues.dollars);

				if (buy) {
					// Check to see if the user has enough balance to purchase if prices have changed.
					if (dollars < totalPrice) {
						saySomething(`<@${user}>, prices have changed since you placed your order and you don't have enough money to complete your purchase of ${amount} units of ${ticker}. You only have $${dollars}. This trade has been cancelled.`);
						await teambot.db.log.update({ executed: 1 }, { where: { id: id } });
						continue;
					}

					const heldStock = logProcessUser.dataValues.holdings.find(element => element.ticker === ticker);
					// Add the shares to their holdings and remove the dollars from their account.
					if (!heldStock) {
						// User doesn't have the stock so create a new holding.
						try {
							// Does the user already have this stock?
							await teambot.db.holdings.create({
								guild: guild,
								userId: user,
								ticker: ticker,
								amount: amount,
							});
						}
						catch (e) {
							return console.log(`Something went wrong buying ${ticker} for ${user} (ID ${id}).`);
						}
					}
					else {
						// User has the stock so update their holding and update the executed field in the log table.
						const heldAmount = Number(heldStock.dataValues.amount);
						const newAmount = heldAmount + amount;
						await teambot.db.holdings.update({ amount: newAmount }, { where: { userId: user, ticker: ticker } });
					}
					const balance = +(dollars - totalPrice).toFixed(2);
					await teambot.db.users.update({ dollars: balance }, { where: { id: logProcessUser.dataValues.id } });
					await teambot.db.log.update({ executed: 1 }, { where: { id: id } });
					saySomething(`<@${user}>, your trade to buy ${amount} units of ${ticker} has been executed for $${totalPrice}. You currently have a balance of $${balance}.`);
					console.log(`${logProcessUser.dataValues.user} bought ${ticker} for ${totalPrice} and now has balance of ${balance}.`);
				}
				if (sell) {
					// Remove the shares from the user and update their account.
					const balance = +(dollars + totalPrice).toFixed(2);
					const heldStock = logProcessUser.dataValues.holdings.find(element => element.ticker === ticker);
					const heldAmount = Number(heldStock.dataValues.amount);

					// Check to see if the user has enough shares to sell as they may have sold some during the wait.
					if (amount > heldAmount) {
						saySomething(`<@${user}>, you have sold off more shares in ${ticker} since you placed your order and don't have enough shares to complete your sale of ${amount} units of ${ticker}. This trade has been cancelled.`);
						await teambot.db.log.update({ executed: 1 }, { where: { id: id } });
						continue;
					}
					const newAmount = heldAmount - amount;

					try {
						await teambot.db.holdings.update({ amount: newAmount }, { where: { userId: user, ticker: ticker } });
						await teambot.db.users.update({ dollars: balance }, { where: { id: logProcessUser.dataValues.id } });
						await teambot.db.log.update({ executed: 1 }, { where: { id: id } });
						saySomething(`<@${user}>, your trade to sell ${amount} units of ${ticker} has been executed for $${totalPrice}. You currently have a balance of $${balance}.`);
						console.log(`${logProcessUser.dataValues.user} sold ${ticker} for ${totalPrice} and now has balance of ${balance} and this many shares: ${newAmount}`);
					}
					catch (error) {
						return console.log(`Something went wrong selling ${ticker} for ${user} (ID ${id}).`);
					}
				}
			}
			catch (e) {
				console.log(`Something went wrong with finding user ${user}.`);
			}
		}

	}, null, true, 'Australia/Sydney');
	marketMinuteJob.start();

	const marketOpenJob = new CronJob('0 45 9 * * 1-5', async function() {
		await saySomething('Ladies and Gentlemen start your engines.');
		await saySomething('Stock codes starting with A-B open at 10:00:00am (+/- 15 seconds)');
		await saySomething('Stock codes starting with C-F open at 10:02:15am (+/- 15 seconds)');
		await saySomething('Stock codes starting with G-M open at 10:04:30am (+/- 15 seconds)');
		await saySomething('Stock codes starting with N-R at 10:06:45am (+/- 15 seconds)');
		await saySomething('Stock codes starting with S-Z at 10:09:00am (+/- 15 seconds)');

	}, null, true, 'Australia/Sydney');
	marketOpenJob.start();

	const roleRemover = new CronJob('0 0 0 * * *', async function() {
		bot.guilds.cache.forEach(async function(g) {
			const role = g.roles.cache.find(role => role.name === "FB Normie");
			if (role) {
				const users = await teambot.db.users.findAll({ where: {
					createdAt: {
						[Op.lte]: moment().tz('Australia/Sydney').subtract(1, 'days').tz('UTC').format(),
						[Op.gte]: moment().tz('Australia/Sydney').subtract(2, 'days').tz('UTC').format(),
					},
				} });

				users.forEach(async function(u) {
					const id = u.dataValues.user;
					const member = g.members.cache.get(id);
					member.roles.remove(role);
				});
			}
		});
	}, null, true, 'Australia/Sydney');
	roleRemover.start();

	// Once a week on a Sunday at midnight.
	const surAddition = new CronJob('0 0 0 * * 0', async function() {
		bot.guilds.cache.forEach(async function(g) {
			const role = g.roles.cache.find(role => role.name === "Suspect Under Review");
			if (role) {
				const users = await teambot.db.users.findAll({
					attributes: ['user', 'guild', 'createdAt'],
					include: [
						{
							model: teambot.db.chats,
							attributes: ['id', 'guild', 'user'],
							required: false
						},
					],
					where: {
						createdAt: {
							[Op.lte]: moment().tz('Australia/Sydney').subtract(60, 'days').tz('UTC').format(),
							[Op.gte]: moment().tz('Australia/Sydney').subtract(90, 'days').tz('UTC').format(),
						},
						'$chats.id$': null,
					},
				});

				users.forEach(async function(u) {
					const id = u.dataValues.user;
					const member = g.members.cache.get(id);
					member.roles.add(role);
				});
			}
		});
	}, null, true, 'Australia/Sydney');
	surAddition.start();

	const asxGame = new CronJob('0 0 1 1 * *', async function() {
		// Add cron job here to runs at 1am on the first day of every month.
		// This will record the closing prices of all stocks for next month's game.
		const thisMonth = moment().format('MMMM YYYY');
		const tickers = await teambot.db.asx.findAll({ where: { date: thisMonth } });

		tickers.forEach(async function(t) {
			const ticker = t.dataValues.ticker;
			const guild = t.dataValues.guild;
			// Call the ASX API for each of the tickers and insert the price into the asxtickers table.
			const asx = await got.get('https://www.asx.com.au/asx/1/share/' + ticker).json();
			teambot.db.asxtickers.create({
				guild: guild,
				ticker: ticker,
				startPrice: asx.last_price,
				date: thisMonth,
			});
		});

		const lastMonth = moment().subtract(1, 'months').format('MMMM YYYY');
		const oldTickers = await teambot.db.asx.findAll({ where: { date: lastMonth } });

		oldTickers.forEach(async function(t) {
			const ticker = t.dataValues.ticker;
			const guild = t.dataValues.guild;
			// Call the ASX API for each of the tickers and insert the price into the asxtickers table.
			const asx = await got.get('https://www.asx.com.au/asx/1/share/' + ticker).json();
			teambot.db.asxtickers.create({
				guild: guild,
				ticker: ticker,
				startPrice: asx.last_price,
				date: thisMonth,
			});
		});

	}, null, true, 'Australia/Sydney');
	asxGame.start();

});

bot.on('messageReactionAdd', (reaction) => {
	if (reaction.emoji.name === '👍' && state.agreeablebot === 'on') {
		reaction.message.react('👍');
	}
	if (reaction.emoji.name === '👎' && state.disagreeablebot === 'on') {
		reaction.message.react('👎');
	}
});

bot.on('message', async message => {

	if (message.author.id === '132048431848882176' && state.grackemoji === 'on') {
		const emoji = message.guild.emojis.cache.find(emoji => emoji.name === 'Grack');
		if (emoji) {
			message.react(emoji);
		}
	}

	if (message.author.id === '244697087298633729' && state.dvkemoji === 'on') {
		const emoji = message.guild.emojis.cache.find(emoji => emoji.name === 'intredasting');
		if (emoji) {
			message.react(emoji);
		}
	}

	if (message.content.toLowerCase().includes('brother') && state.brotheremoji === 'on') {
		const emoji = message.guild.emojis.cache.find(emoji => emoji.name === 'Brother');
		if (emoji) {
			message.react(emoji);
		}
	}

	if (message.content.toLowerCase().includes('monster') && state.monsteremoji === 'on') {
		const emoji = message.guild.emojis.cache.find(emoji => emoji.name === 'monsterposition');
		if (emoji) {
			message.react(emoji);
		}
	}

	if (message.content.toLowerCase().includes('twitter.com/bhagdip143') && state.bhagdipemoji === 'on') {
		const emoji = message.guild.emojis.cache.find(emoji => emoji.name === 'baghdeep');
		if (emoji) {
			message.react(emoji);
		}
	}

	// Log chat but protect privacy by entering a '1' into the database for the chatline rather than content.
	try {
		if (!message.guild) return;
		teambot.db.chats.create({
			guild: message.guild.id,
			channel: message.channel.id,
			messageId: message.id,
			deleted: message.deleted,
			user: message.author.id,
			chatline: 1,
		});
	}
	catch (error) {
		console.log(error);
	}

	// Only for specific bot channels after this, remove listening from DMs, and prevent actions if the bot spoke.
	if (message.channel.type === 'dm' || message.author.bot) return;

	// Check messages start with prefix (defaults to !).
	if (message.content.startsWith(prefix)) {
		const args = message.content.slice(prefix.length).trim().split(/ +/);
		const commandName = args.shift().toLowerCase();

		// Only respond if the command matches a command loaded at the top of this file (or one of its aliases).
		const command = bot.commands.get(commandName)
		|| bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

		let loadedUser = [];
		try {
			loadedUser = await teambot.db.users.findOne({ where: {
				guild: message.guild.id,
				user: message.author.id,
			} });
		}
		catch (e) {
			return message.reply('Something went wrong with finding user.');
		}

		// For Debugging.
		if (permissions.isAdmin(loadedUser.dataValues.permission) && commandName === 'join') {
			return bot.emit('guildMemberAdd', message.member);
		}

		if (command && (command.permission & loadedUser.dataValues.permission) && channels.canCommandRun(command, message.channel.id)) {
			if (command.args && !args.length) {
				let reply = `You didn't provide any arguments, ${message.author}!`;
				if (command.usage) {
					reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
				}
				return message.channel.send(reply);
			}
			if (command.guildOnly && message.channel.type !== 'text') {
				return message.reply('I can\'t execute that command inside DMs!');
			}
			try {
				// Inject/update the bot variable before the command is executed.
				teambot.bot = bot;
				teambot.user = loadedUser;
                                teambot.state = state;
				return command.execute(teambot, message, args);
			}
			catch (error) {
				console.error(error);
				return message.reply('there was an error trying to execute that command!');
			}
		}
		if (teambot.permissions.isAdmin(loadedUser.dataValues.permission)) {
			if (commandName === 'set') {
				console.log('Setting key');
				const key = args.shift().toLowerCase();
				const value = args.join();
				console.log(`${key} => ${value}`);
				// Save it in the state variable.
				state[key] = value;
				console.log(state);
				// Save it in the database for persistence.
				try {
					await teambot.db.kvs.create({
						guild: message.guild.id,
						key: key,
						value: value,
					});
				}
				catch (error) {
					if (error.name === 'SequelizeUniqueConstraintError') {
						try {
							await teambot.db.kvs.update({ value: value }, { where: { guild: message.guild.id, key: key } });
						}
						catch (e) {
							console.log(e);
						}
					}
				}
				return message.reply(`${key} has been set to ${value}`);
			}
			if (commandName === 'get') {
				console.log(state);
				const key = args.shift().toLowerCase();
				let value = state[key];
				console.log(`${key} => ${value}`);
				if (typeof value === 'undefined' || value === null) {
					let dbValue = null;
					try {
						dbValue = await teambot.db.kvs.findOne({ where: {
							guild: message.guild.id,
							key: key,
						} });
						value = dbValue.dataValues.value;
						if (typeof value !== 'undefined' && value !== null) {
							state[key] = value;
							console.log(state);
							return message.reply(`Value is ${value}`);
						}
					}
					catch (e) {
						console.log(e);
						return message.reply(`No stored value for ${key}`);
					}
				}
				return message.reply(`Value is ${value}`);
			}
		}
	}

	if (!(allowedChannels.includes(message.channel.id))) return;

	// Karma matches
	const karma = /<@!\d+>\s?\+\+|<@!\d+>\s?--/gm;
	let l;

	while ((l = karma.exec(message.content)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (l.index === karma.lastIndex) {
			karma.lastIndex++;
		}
		// The result can be accessed through the `m`-variable.
		l.forEach((match) => {
			if (lock.isBusy()) return;
			lock.acquire('karma', function(done) {
				registerKarma(message, match);
				setTimeout(function() {
					done();
				}, timer);
			}, function(err, ret) {
				console.log('Karma error!');
				console.log(err);
				console.log(ret);
			});
		});
	}

	// Fall through to matching stocks.
	const regex = /[$]\w+/gm;
	let m;

	while ((m = regex.exec(message.content)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}
		// The result can be accessed through the `m`-variable.
		m.forEach((match) => {
			goGetStock(message, match);
		});
	}
});

// Fire when new members join the server.
bot.on('guildMemberAdd', async member => {

	// Send the message to a designated channel on a server. @TODO change this to configuration managed.
	const channel = member.guild.channels.cache.find(ch => ch.name === 'welcome-channel');

	// Update their record within the user database.
	try {
		await teambot.db.users.upsert({
			guild: member.guild.id,
			user: member.id,
			permission: permissions.STANDARD,
			name: member.nickname,
			dollars: 50000,
		});
	}
	catch (e) {
		if (e.name === 'SequelizeUniqueConstraintError') {
			return channel.send('That user already exists.');
		}
		return channel.send('Something went wrong with adding a user.');
	}

	if (!channel) return;

	const startOfDay = moment().tz('Australia/Sydney').startOf('day').tz('UTC').format();

	const userCount = await teambot.db.users.count({ where: {
		guild: member.guild.id,
		createdAt: {
			[Op.gte]: startOfDay,
		},
	} });

	const welcomes = await teambot.db.welcomes.findOne({ order: Sequelize.literal('rand()') });

	// Set up the welcome canvas.
	const canvas = createCanvas(700, 250);
	const ctx = canvas.getContext('2d');

	const background = await loadImage('./assets/wallpaper.jpg');
	ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 5;
	ctx.strokeRect(0, 0, canvas.width, canvas.height);

	ctx.font = '80px Lato';
	ctx.fillStyle = '#ffffff';
	ctx.fillText('ohai', canvas.width / 2.5, canvas.height / 3);
	// Pass the ! here too.
	ctx.font = applyText(canvas, `${member.displayName}!`);
	ctx.fillText(`${member.displayName}!`, canvas.width / 2.5, canvas.height / 1.5);

	const totalUsers = (await member.guild.members.fetch()).filter(member => !member.user.bot).size;
	ctx.font = '20px Lato';

	// Use 'x' as the format for unix time in milliseconds.
	const userCreated = moment(member.user.createdTimestamp, 'x').fromNow();
	ctx.fillText(`Member #${totalUsers} ⋆ Joined ${userCreated}`, canvas.width / 2.5, (canvas.height / 9) * 8);

	// Puts the border around the avatar.
	ctx.beginPath();
	ctx.arc(125, canvas.height / 2, 100, 0, 2 * Math.PI, false);
	ctx.lineWidth = 8;
	ctx.stroke();

	// Removes edges from the avatar.
	ctx.beginPath();
	ctx.arc(125, 125, 100, 0, Math.PI * 2, true);
	ctx.closePath();
	ctx.clip();

	const avatar = await loadImage(member.user.displayAvatarURL({ format: 'jpg' }));
	// DEBUG only.
	// const avatar = await loadImage('./assets/avatar.png');
	ctx.drawImage(avatar, 25, 25, 200, 200);

	const attachment = new MessageAttachment(canvas.toBuffer(), 'welcome-image.png');

	const users = pluralize('user', userCount);
	const have = pluralize('has', userCount);
	channel.send(`${welcomes.dataValues.welcome} ${member}. ${userCount} new ${users} ${have} joined today.`, attachment);

	const role = member.guild.roles.cache.find(role => role.name === "FB Normie");
	if (role) {
		member.roles.add(role);
	}

	const dm = [];
	const server = member.guild.name;
	let rules = member.guild.channels.cache.find(
		channel => channel.name.toLowerCase() === "read-me"
	)
	let botChannel = member.guild.channels.cache.find(
		channel => channel.name.toLowerCase() === "trading-bot-channel"
	)
	let normieChannel = member.guild.channels.cache.find(
		channel => channel.name.toLowerCase() === "fb-normie-enclosure"
	)
	dm.push(`Welcome new loser to ${server}. You are loser #${totalUsers} and very important to us.\n`);
	dm.push(`Since you're new here, we thought it would be important to send you some information so you don't immediately make a fool of yourself.\n`);
	dm.push(`As you probably have a reading age of 5, we will keep it simple so you don't get confused:`);
	dm.push(`- Make sure you read the rules first before saying anything. These are found here: <#${rules.id}>`);
	dm.push(`- Continue following the rules.`);
	dm.push(`- There are no further steps.\n`);
	dm.push(`If you show that you aren't a sperg you will get access to the other channels. Please show your value by sending some semi-intelligent messages in <#${normieChannel.id}> to unlock everything.\n`);
	dm.push(`${state.botname} commands can be found by typing !commands in <#${botChannel.id}>.`);

	return member.send(dm, { split: true })
		.then(() => {
			console.log(`Sent welcome message to ${member.displayName}.\n`);
		})
		.catch(error => {
			console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
		});

});

// Fire when users have their role updated.
bot.on('guildMemberUpdate', async (oldMember, newMember) => {

	const log = await auditLookup('GUILD_MEMBER_UPDATE', newMember.guild);
	const { executor, target } = log;

	// If the role(s) are present on the old member object but no longer on the new one (i.e role(s) were removed)
	const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
	if (removedRoles.size > 0) {
		auditLine(`The role(s) ${removedRoles.map(r => r.name)} were removed from ${oldMember.displayName} by ${executor.tag}.`);
		if (removedRoles.map(r => r.name).includes('FB Normie')) {
			if (executor.id !== client_id) {
				let normieChannel = oldMember.guild.channels.cache.find(
					channel => channel.name.toLowerCase() === "fb-normie-enclosure"
				)
				if (normieChannel) {
					normieChannel.send(`Congratulations for escaping the ape enclosure <@${oldMember.id}>. Take note everyone.`);
				}
				let dm = [];
				dm.push(`Congratulations for escaping the ape enclosure, you're now free to see and chat in all channels.`);
				oldMember.send(dm, { split: true })
			}
		}
	}
	// If the role(s) are present on the new member object but are not on the old one (i.e role(s) were added)
	const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
	if (addedRoles.size > 0) auditLine(`The role(s) ${addedRoles.map(r => r.name)} were added to ${oldMember.displayName} by ${executor.tag}.`);

});

// Fires when new channels are created.
bot.on('channelCreate', async channel => {
	// Return here for dm as they are also counted as channelCreate events.
	if (channel.type === 'dm') return;
	const log = await auditLookup('CHANNEL_CREATE', channel.guild);

	if (!log) return console.log(`${channel.name} has been created, but no audit log could be found.`);
	const { executor } = log;

	auditLine(`${channel.name} has been created by ${executor.tag}.`);
});

// Fires when channels are deleted.
bot.on('channelDelete', async channel => {
	const log = await auditLookup('CHANNEL_DELETE', channel.guild);

	if (!log) return console.log(`${channel.name} has been deleted, but no audit log could be found.`);
	const { executor } = log;

	auditLine(`${channel.name} has been deleted by ${executor.tag}.`);
});

// Fires when users are removed from the server - either by themselves or by another person.
bot.on('guildMemberRemove', async member => {
	const log = await auditLookup('MEMBER_KICK', member.guild);

	if (!log) return console.log(`${member.user.tag} left the server, most likely of their own will.`);
	const { executor, target } = log;

	if (target.id === member.id) {
		auditLine(`${member.user.tag} left the server; kicked by ${executor.tag}.`);
	}
	else {
		auditLine(`${member.user.tag} left the server, audit log fetch was inconclusive.`);
	}
});

// Fires when a ban occurs.
bot.on('guildBanAdd', async (guild, user) => {
	const log = await auditLookup('MEMBER_BAN_ADD', guild);

	if (!log) return auditLine(`${user.tag} was banned from ${guild.name} but no audit log could be found.`);
	const { executor, target } = log;

	if (target.id === user.id) {
		auditLine(`${user.tag} got banned in the server ${guild.name}, by ${executor.tag}`);
	}
	else {
		auditLine(`${user.tag} got banned in the server ${guild.name}, audit log fetch was inconclusive.`);
	}
});

// Fires when a ban is revoked.
bot.on('guildBanRemove', async (guild, user) => {
	const log = await auditLookup('MEMBER_BAN_REMOVE', guild);

	if (!log) return auditLine(`${user.tag} was unbanned from ${guild.name} but no audit log could be found.`);
	const { executor, target } = log;

	if (target.id === user.id) {
		auditLine(`${user.tag} got unbanned in the server ${guild.name}, by ${executor.tag}`);
	}
	else {
		auditLine(`${user.tag} got unbanned in the server ${guild.name}, audit log fetch was inconclusive.`);
	}
});

// Fires when messages are deleted - either by the user or by another person.
// bot.on('messageDelete', async message => {
// Uncomment these lines to audit message deletions.
// if (!message.guild) return;
// const log = await auditLookup('MESSAGE_DELETE', message.guild);

// if (!log) return auditLine(`A message by ${message.author.tag} in #${message.channel.name} was deleted, but no relevant audit logs were found. The message was "${message.content}"`);
// const { executor, target } = log;

// if (target.id === message.author.id) {
// 	auditLine(`A message by ${message.author.tag} in #${message.channel.name} was deleted by ${executor.tag}. The message was "${message.content}"`);
// }
// else {
// 	auditLine(`A message by ${message.author.tag} in #${message.channel.name} was deleted by themselves. The message was "${message.content}"`);
// }

// try {
// 	await teambot.db.chats.update({ deleted: true }, { where: { messageId: message.id } });
// }
// catch (error) {
// 	console.log(error);
// }
// });

// Fires when a user's presence changes e.g. status change, music change etc.
// This function can be removed when we reach parity with what's in the UserDB.
// There may be other uses for this function e.g. updating users on name changes.
bot.on('presenceUpdate', async (oldMember, newMember) => {
	const user = newMember.guild.members.cache.find(user => user.id === newMember.userID);

	try {
		await teambot.db.users.upsert({
			guild: newMember.guild.id,
			user: newMember.userID,
			permission: permissions.STANDARD,
		});
		await teambot.db.users.update({
			name: user.nickname
		},
		{
			where: {
				guild: newMember.guild.id,
				user: newMember.userID,
			}
		})

	}
	catch (e) {
		console.log(e);
	}
});

bot.login(token);

const applyText = (canvas, text) => {
	const ctx = canvas.getContext('2d');

	// Declare a base size of the font
	let fontSize = 120;

	do {
		// Assign the font to the context and decrement it so it can be measured again
		ctx.font = `${fontSize -= 10}px Lato`;
	} while ((ctx.measureText(text).width) > canvas.width - 300);

	// Return the result to use in the actual canvas
	return ctx.font;
};

async function auditLookup(type, guild) {
	const fetchedLogs = await guild.fetchAuditLogs({
		limit: 1,
		type: type,
	});
	return fetchedLogs.entries.first();
}

function auditLine(line) {
	const chan = bot.channels.cache.get(auditChannel);
	if (chan) {
		chan.send(`${line}`);
	}
	console.log(line);
}

function sayInAllowedChannels(line) {
	allowedChannels.forEach(function(channel) {
		const chan = bot.channels.cache.get(channel);
		if (chan) {
			chan.send(`${line}`);
		}
	});
}

function saySomething(line) {
	const chan = bot.channels.cache.get(botChannel);
	if (chan) {
		chan.send(`${line}`);
	}
}

function randomLine() {
	(async () => {
		const botlines = await teambot.db.botlines.findOne({ order: Sequelize.literal('rand()') });
		sayInAllowedChannels(`${botlines.dataValues.botline}`);
	})();
}

(function loop() {
	// const rand = Math.round(Math.random() * 21600000); // 6 hours.
	// 24 hours.
	const rand = Math.round(Math.random() * 86400000);
	setTimeout(function() {
		randomLine();
		loop();
	}, rand);
}());

function goGetStock(message, match) {
	const stockPrefix = match[0];
	const stock = match.substr(1).toUpperCase();

	(async () => {
		let request = '';
		let yahoo = '';
		let url = '';
		try {
			if (stockPrefix === '$') {
				request = await got.get('https://www.asx.com.au/asx/1/share/' + stock).json();
				yahoo = await got.get('http://d.yimg.com/autoc.finance.yahoo.com/autoc?query=' + stock + '.ax&lang=en');
				url = 'https://www.bloomberg.com/quote/' + stock + ':AU';
			}
			else if (stockPrefix === '!') {
				request = await got.get('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=' + stock + '&apikey=' + avApiKey).json();
				if (!request['Global Quote']) return;

				request.last_price = request['Global Quote']['05. price'];
				request.day_high_price = request['Global Quote']['03. high'];
				request.day_low_price = request['Global Quote']['04. low'];
				request.open_price = request['Global Quote']['02. open'];
				request.change_price = request['Global Quote']['09. change'];
				request.change_in_percent = request['Global Quote']['10. change percent'];
				request.previous_close_price = request['Global Quote']['08. previous close'];

				yahoo = await got.get('http://d.yimg.com/autoc.finance.yahoo.com/autoc?query=' + stock + '&lang=en');
				url = 'https://www.bloomberg.com/quote/' + stock + ':US';
			}
		}
		catch (error) {
			return;
		}

		const yahooBody = yahoo.body;
		const yahooJson = JSON.parse(yahooBody);

		if (!yahooJson.ResultSet.Result[0]) return;

		const stockName = yahooJson.ResultSet.Result[0].name;

		let thumbnail = 'https://i.imgur.com/zCl2dri.jpg';
		let color = '0x0099ff';
		if (request.last_price > request.previous_close_price) {
			thumbnail = 'https://i.imgur.com/RfWldqJ.png';
			color = '#64876f';
		}
		else if (request.last_price < request.previous_close_price) {
			thumbnail = 'https://i.imgur.com/mjjZD7d.jpg';
			color = '#d44942';
		}

		const stockEmbed = new MessageEmbed()
			.setColor(color)
			.setTitle(stockName)
			.setURL(url)
			.setAuthor('TeamBot', 'https://i.imgur.com/zCl2dri.jpg', 'https://github.com/teamshape/teambot')
			.setThumbnail(thumbnail)
			.addFields(
				{ name: 'Price', value: request.last_price },
				{ name: 'High', value: request.day_high_price, inline: true },
				{ name: 'Low', value: request.day_low_price, inline: true },
				{ name: 'Open', value: request.open_price, inline: true },
				{ name: 'Change $', value: request.change_price, inline: true },
				{ name: 'Change %', value: request.change_in_percent, inline: true },
				{ name: 'Previous close', value: request.previous_close_price, inline: true },
			)
			.setTimestamp()
			.setFooter('Data delayed by 15m', 'https://i.imgur.com/zCl2dri.jpg');

		return message.channel.send({ embed: stockEmbed });

	})();
}

async function registerKarma(message, match) {
	const userId = match.slice(3, -2).trim().slice(0, -1);

	if (userId === message.author.id) return;

	if (match.endsWith('+')) {
		message.channel.send(`Adding karma to <@!${userId}>`);
		try {
			await teambot.db.karmas.create({
				guild: message.guild.id,
				user: userId,
				karma: 1,
			});
		}
		catch (error) {
			if (error.name === 'SequelizeUniqueConstraintError') {
				await teambot.db.karmas.update({ karma: teambot.db.sequelize.literal('IFNULL(karma, 0) + 1') }, { where: { user: userId } });
			}
		}
	}
	else {
		message.channel.send(`Removing karma from <@!${userId}>`);
		try {
			await teambot.db.karmas.create({
				guild: message.guild.id,
				user: userId,
				karma: -1,
			});
		}
		catch (error) {
			if (error.name === 'SequelizeUniqueConstraintError') {
				await teambot.db.karmas.update({ karma: teambot.db.sequelize.literal('IFNULL(karma, 0) - 1') }, { where: { user: userId } });
			}
		}
	}
}
