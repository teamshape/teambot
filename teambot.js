'use strict';
const timerStart = Date.now();

const fs = require('fs');
const got = require('got');
const moment = require('moment-timezone');
const { Client, Collection, Intents, MessageAttachment, MessageEmbed } = require('discord.js');
const { token, allowedChannels, botChannel, avApiKey, timer, prefix, client_id } = require('./config/teambot.json');
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
const state = require('./util/state');

const teambot = {
	db: db,
	permissions: permissions,
	state: state,
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
			const userId = b.dataValues.user;
			const user = bot.users.cache.get(userId);
			try {
				teambot.db.bans.destroy({
					where: {
						id: b.dataValues.id,
					},
				});
				guild.members.unban(user);
				saySomething(`${user.displayName} has been unbanned.`);
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
			const role = g.roles.cache.find(fRole => fRole.name === 'FB Normie');
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
                                        // Check if member still exists. Some leave before we can un-ape them automatically (lmao).
                                        if (member) {
					        member.roles.remove(role);
                                        }
				});
			}
		});
	}, null, true, 'Australia/Sydney');
	roleRemover.start();

	// Once a week on a Sunday at midnight.
	const surAddition = new CronJob('0 0 0 * * 0', async function() {
		bot.guilds.cache.forEach(async function(g) {
			const role = g.roles.cache.find(sRole => sRole.name === 'Suspect Under Review');
			if (role) {
				const users = await teambot.db.users.findAll({
					attributes: ['user', 'guild', 'createdAt'],
					include: [
						{
							model: teambot.db.chats,
							attributes: ['id', 'guild', 'user'],
							required: false,
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

bot.on('messageReactionAdd', async (reaction) => {
	if (bot.emojis.cache.get(reaction.emoji.id)) {
		let reactResponses = [];
		try {
			reactResponses = await teambot.db.responses.findAll({ where: {
				guild: reaction.message.guild.id,
				react: true,
				target: reaction.emoji.id,
			} });
		}
		catch (e) {
			console.log(e);
		}

		reactResponses.forEach(async function(t) {
			reaction.message.react(t.dataValues.response);
		});

	}

});

bot.on('message', async message => {

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

	let userResponses = [];
	try {
		userResponses = await teambot.db.responses.findAll({ where: {
			guild: message.guild.id,
			target: message.author.id,
			user: true,
		} });
	}
	catch (e) {
		console.log(e);
	}

	userResponses.forEach(async function(t) {
		message.react(t.dataValues.response);
	});

	let wordResponses = [];
	try {
		wordResponses = await teambot.db.responses.findAll({ where: {
			guild: message.guild.id,
			word: true,
		} });
	}
	catch (e) {
		console.log(e);
	}

	wordResponses.forEach(async function(w) {
		if (message.content.toLowerCase().includes(w.dataValues.target.toLowerCase())) {
			message.react(w.dataValues.response);
		}
	});

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
		if (permissions.isAdmin(loadedUser.dataValues.permission) && commandName === 'helpme') {
                        const role = bot.roles.cache.find(fRole => fRole.name === 'FB Normie');
                        message.member.roles.remove(role);
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
	}

	// Fall through to matching stocks.
	const regex = /[$!]\w+/gm;
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


});

// Fire when new members join the server.
bot.on('guildMemberAdd', async member => {

	// Send the message to a designated channel on a server. @TODO change this to configuration managed.
	// const channel = member.guild.channels.cache.find(ch => ch.name === 'welcome-channel');
        const channel = member.guild.channels.cache.get("721332319943786537");

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

	// rand() only works on MySQL driver so switch query depending on which DB driver we're using.
	let welcomes;
	if (db.sequelize.getDialect() === 'sqlite') {
		welcomes = await teambot.db.welcomes.findOne();
	}
	else {
		welcomes = await teambot.db.welcomes.findOne({ order: Sequelize.literal('rand()') });
	}

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

	const totalUsers = (await member.guild.members.fetch()).filter(fMember => !fMember.user.bot).size;
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

	// Add the normie role to the user.
	const role = member.guild.roles.cache.find(fRole => fRole.name === 'FB Normie');
	if (role) {
		member.roles.add(role);
	}

	// Send the welcome DM and wait for them to react to it.
	const server = member.guild.name;
	const rules = member.guild.channels.cache.find(
		rChannel => rChannel.name.toLowerCase() === 'read-me',
	);
	const tradingBotChannel = member.guild.channels.cache.find(
		tChannel => tChannel.name.toLowerCase() === 'trading-bot-channel',
	);
	const normieChannel = member.guild.channels.cache.find(
		aChannel => aChannel.name.toLowerCase() === 'ape-enclosure',
	);
	let dm = `Welcome new loser to ${server}. You are loser #${totalUsers} and very important to us.\n\n`;
	dm += 'Since you\'re new here, we thought it would be important to send you some information so you don\'t immediately make a fool of yourself.\n\n';
	dm += 'As you probably have a reading age of 5, we will keep it simple so you don\'t get confused:\n';
	dm += `- Make sure you read the rules first before saying anything. These are found here: <#${rules.id}>\n`;
	dm += '- Continue following the rules.\n';
	dm += '- There are no further steps.\n\n';
	dm += `If you show that you aren't a sperg you will get access to the other channels. Please show your value by sending some semi-intelligent messages in <#${normieChannel.id}> to unlock everything.\n\n`;
	dm += `Bot commands can be found by typing !commands in <#${tradingBotChannel.id}>.\n\n`;
	dm += 'Automatically validate yourself by adding a 📉 reaction to this message within the next 60 seconds.\n';

	member.send(dm)
		.then(function(message) {
			message.react('📈');
			message.react('📉');
			console.log(`Sent welcome message to ${member.displayName}.`);

			const filter = (reaction, user) => {
				return ['📉'].includes(reaction.emoji.name) && user.id === member.id;
			};

			message.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
				.then(collected => {
					console.log(`${member.displayName} added the correct emoji ${collected.size} times.`);
					// Remove the fb normie role that was added above.
                                        if (normieChannel) {
                                                normieChannel.send(`Some apes are smarter than others. Congratulations <@${member.id}>.`);
                                        }
					member.roles.remove(role);
				})
				.catch(collected => {
					console.log(`After a minute, ${member.displayName} sent no (${collected.size}) reactions.`);
				});
		})
		.catch(error => {
			console.error(`Could not send help DM to ${member.displayName}.\n`, error);
		});
});

// Fire when users have their role updated.
bot.on('guildMemberUpdate', async (oldMember, newMember) => {

	const log = await auditLookup('GUILD_MEMBER_UPDATE', newMember.guild);
	const { executor } = log;

	// If the role(s) are present on the old member object but no longer on the new one (i.e role(s) were removed)
	const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
	if (removedRoles.size > 0) {
		auditLine('GUILD_MEMBER_UPDATE', newMember.guild.id, `The role(s) ${removedRoles.map(r => r.name)} were removed from ${oldMember.displayName} by ${executor.tag}.`);
		if (removedRoles.map(r => r.name).includes('FB Normie')) {
			if (executor.id !== client_id) {
				const normieChannel = oldMember.guild.channels.cache.find(
					channel => channel.name.toLowerCase() === 'ape-enclosure',
				);
				if (normieChannel) {
					normieChannel.send(`Congratulations for escaping the ape enclosure <@${oldMember.id}>. Take note everyone.`);
				}
				const dm = [];
				dm.push('Congratulations for escaping the ape enclosure, you\'re now free to see and chat in all channels.');
				oldMember.send(dm, { split: true });
			}
		}
	}
	// If the role(s) are present on the new member object but are not on the old one (i.e role(s) were added)
	const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
	if (addedRoles.size > 0) auditLine('GUILD_MEMBER_UPDATE', newMember.guild.id, `The role(s) ${addedRoles.map(r => r.name)} were added to ${oldMember.displayName} by ${executor.tag}.`);

});

// Fires when new channels are created.
bot.on('channelCreate', async channel => {
	// Return here for dm as they are also counted as channelCreate events.
	if (channel.type === 'dm') return;
	const log = await auditLookup('CHANNEL_CREATE', channel.guild);

	if (!log) return console.log(`${channel.name} has been created, but no audit log could be found.`);
	const { executor } = log;

	auditLine('CHANNEL_CREATE', channel.guild.id, `${channel.name} has been created by ${executor.tag}.`);
});

// Fires when channels are deleted.
bot.on('channelDelete', async channel => {
	const log = await auditLookup('CHANNEL_DELETE', channel.guild);

	if (!log) return console.log(`${channel.name} has been deleted, but no audit log could be found.`);
	const { executor } = log;

	auditLine('CHANNEL_DELETE', channel.guild.id, `${channel.name} has been deleted by ${executor.tag}.`);
});

// Fires when users are removed from the server - either by themselves or by another person.
bot.on('guildMemberRemove', async member => {
	const log = await auditLookup('MEMBER_KICK', member.guild);

	if (!log) return console.log(`${member.user.tag} left the server, most likely of their own will.`);
	const { executor, target } = log;

	if (target.id === member.id) {
		auditLine('MEMBER_KICK', member.guild.id, `${member.user.tag} left the server; kicked by ${executor.tag}.`);
	}
	else {
		auditLine('MEMBER_KICK', member.guild.id, `${member.user.tag} left the server, audit log fetch was inconclusive.`);
	}
});

// Fires when a ban occurs.
bot.on('guildBanAdd', async (guild, user) => {
	const log = await auditLookup('MEMBER_BAN_ADD', guild);

	if (!log) return auditLine('MEMBER_BAN_ADD', guild.id, `${user.tag} was banned from ${guild.name} but no audit log could be found.`);
	const { executor, target } = log;

	if (target.id === user.id) {
		auditLine('MEMBER_BAN_ADD', guild.id, `${user.tag} got banned in the server ${guild.name}, by ${executor.tag}`);
	}
	else {
		auditLine('MEMBER_BAN_ADD', guild.id, `${user.tag} got banned in the server ${guild.name}, audit log fetch was inconclusive.`);
	}
});

// Fires when a ban is revoked.
bot.on('guildBanRemove', async (guild, user) => {
	const log = await auditLookup('MEMBER_BAN_REMOVE', guild);

	if (!log) return auditLine('MEMBER_BAN_REMOVE', guild.id, `${user.tag} was unbanned from ${guild.name} but no audit log could be found.`);
	const { executor, target } = log;

	if (target.id === user.id) {
		auditLine('MEMBER_BAN_REMOVE', guild.id, `${user.tag} got unbanned in the server ${guild.name}, by ${executor.tag}`);
	}
	else {
		auditLine('MEMBER_BAN_REMOVE', guild.id, `${user.tag} got unbanned in the server ${guild.name}, audit log fetch was inconclusive.`);
	}
});

// Fires when a channel is updated.
bot.on('channelUpdate', async (oldChannel, newChannel) => {
	auditLine('CHANNEL_UPDATE', newChannel.guild.id, `Channel ${newChannel.name} has been updated.`);
});

bot.on('messageDelete', async message => {
	// Ignore direct messages
	if (!message.guild) return;

	// Update chats to show the message was deleted.
	teambot.db.chats.update({ deleted: true }, { where: { messageId: message.id } });

	const log = await auditLookup('MESSAGE_DELETE', message.guild);

	if (!log) return auditLine('MESSAGE_DELETE', message.guild.id, `A message by ${message.author.tag} in #${message.channel.name} was deleted, but no relevant audit logs were found. The message was: "${message.content}"`);
	const { executor, target } = log;

	let userId;
	if (target.id === message.author.id) {
		auditLine('MESSAGE_DELETE', message.guild.id, `A message by ${message.author.tag} in #${message.channel.name} was deleted by ${executor.tag}. The message was: "${message.content}"`);
		userId = executor.id;
	}
	else {
		auditLine('MESSAGE_DELETE', message.guild.id, `A message by ${message.author.tag} in #${message.channel.name} was deleted by themselves. The message was: "${message.content}"`);
		userId = message.author.id;
	}

	// Only delete if our state is not set and the message was sent under 20s ago.
	const disablenodeleting = await state.get(message.guild, 'disablenodeleting');
	if ((!disablenodeleting || disablenodeleting == 0) && message.createdTimestamp > Date.now() - 20000) {
		const chan = bot.channels.cache.get(message.channel.id);
		if (chan) {
			chan.send(`NO DELETING <@${userId}>`);
		}
	}
});

// Fires when a user's presence changes e.g. status change, music change etc.
// This function can be removed when we reach parity with what's in the UserDB.
// There may be other uses for this function e.g. updating users on name changes.
bot.on('presenceUpdate', async (oldMember, newMember) => {
	const user = newMember.guild.members.cache.find(fUser => fUser.id === newMember.userID);

	try {
		await teambot.db.users.upsert({
			guild: newMember.guild.id,
			user: newMember.userID,
			permission: permissions.STANDARD,
		});
		await teambot.db.users.update({
			name: user.nickname,
		},
		{
			where: {
				guild: newMember.guild.id,
				user: newMember.userID,
			},
		});

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

async function auditLine(event, guild, message) {
	try {
		await teambot.db.audit.create({
			event: event,
			guild: guild,
			message: message,
		});
	}
	catch (error) {
		console.log(error);
	}
	console.log(message);
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
		let botlines;
		if (db.sequelize.getDialect() === 'sqlite') {
			botlines = await teambot.db.botlines.findOne();
		}
		else {
			botlines = await teambot.db.botlines.findOne({ order: Sequelize.literal('rand()') });
		}
		sayInAllowedChannels(`${botlines.dataValues.botline}`);
	})();
}

(function loop() {
	// 6 hours.
	// const rand = Math.round(Math.random() * 21600000);
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
