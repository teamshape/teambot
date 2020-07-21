'use strict';
const timerStart = Date.now();

const fs = require('fs');
const got = require('got');
const moment = require('moment-timezone');
const { Client, Collection, Intents, MessageAttachment, MessageEmbed } = require('discord.js');
const { token, allowedChannels, avApiKey, timer, prefix } = require('./config.json');
const { CronJob } = require('cron');
const { Sequelize, Op } = require('sequelize');
const AsyncLock = require('async-lock');
const pluralize = require('pluralize');
const { registerFont, createCanvas, loadImage } = require('canvas');
const lock = new AsyncLock();

// Set up the bot and its intents.
const bot = new Client();
// const bot = new Client({ ws: { intents: Intents.ALL } });

// Load local files to define required features for the bot.
const db = require('./db.js');
const permissions = require('./permissions.js');
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
bot.once('ready', () => {
	const timerEnd = (Date.now() - timerStart) / 1000;
	console.log(`${bot.user.tag} v1.0.0 loaded in ${timerEnd} seconds!`);
	saySomething(`${bot.user.tag} v1.0.0 loaded in ${timerEnd} seconds!`);

	bot.user.setUsername('TeamBot Nguyen')
		.then(user => console.log(`Username set to ${user.username}`))
		.catch(console.error);

	bot.user.setPresence({ activity: { name: '光復香港，時代革命', type: 'WATCHING' }, status: 'online' })
		.then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
		.catch(console.error);

	const job = new CronJob('0 * * * * *', async function() {
		const reminders = await teambot.db.RemindDB.findAll({ where: {
			reminder_timestamp: {
				[Op.lte]: Date.now(),
			},
		} });

		reminders.forEach(function(rm) {
			const reminder_channel = bot.channels.cache.get(rm.dataValues.channel);
			const member = rm.dataValues.user;
			const reminder_message = rm.dataValues.reminder;
			if (reminder_channel) {
				reminder_channel.send(`<@${member}>: ${reminder_message}`);
				teambot.db.RemindDB.destroy({
					where: {
						id: rm.dataValues.id,
					},
				});
			}
		});
	}, null, true, 'Australia/Sydney');
	job.start();

	const alertJob = new CronJob('0 * 10-16 * * 1-5', async function() {
		const alerts = await teambot.db.AlertDB.findAll();

		alerts.forEach(async function(a) {
			const member = a.dataValues.user;
			const stock = a.dataValues.stock;
			const operator = a.dataValues.operator;
			const price = a.dataValues.price;

			const asx = await got.get('https://www.asx.com.au/asx/1/share/' + stock).json();

			if (operator === '>' && asx.last_price >= price) {
				saySomething(`<@${member}>: ${stock} rose to/above your alert price of ${price} and is now trading at ${asx.last_price}`);
				teambot.db.AlertDB.destroy({
					where: {
						id: a.dataValues.id,
					},
				});
			}
			else if (operator === '<' && asx.last_price <= price) {
				saySomething(`<@${member}>: ${stock} dropped to/below your alert price of ${price} and is now trading at ${asx.last_price}`);
				teambot.db.AlertDB.destroy({
					where: {
						id: a.dataValues.id,
					},
				});
			}
		});


	}, null, true, 'Australia/Sydney');
	alertJob.start();

	const marketOpenJob = new CronJob('0 45 9 * * 1-5', async function() {
		await saySomething('Ladies and Gentlemen start your engines.');
		await saySomething('Stock codes starting with A-B open at 10:00:00am (+/- 15 seconds)');
		await saySomething('Stock codes starting with C-F open at 10:02:15am (+/- 15 seconds)');
		await saySomething('Stock codes starting with N-R at 10:06:45am (+/- 15 seconds)');
		await saySomething('Stock codes starting with S-Z at 10:09:00am (+/- 15 seconds)');

	}, null, true, 'Australia/Sydney');
	marketOpenJob.start();

});

bot.on('messageReactionAdd', (reaction) => {
	if (reaction.emoji.name === '👍') {
		reaction.message.react('👍');
	}
});

bot.on('message', async message => {

	// Log chat
	try {
		teambot.db.ChatDB.create({
			guild: message.guild.id,
			channel: message.channel.id,
			messageId: message.id,
			deleted: message.deleted,
			user: message.author.id,
			chatline: message.content,
		});
	}
	catch (error) {
		console.log(error);
	}

	if (message.content.toLowerCase().includes('brother')) {
		const emoji = message.guild.emojis.cache.find(emoji => emoji.name === 'Brother');
		if (emoji) {
			message.react(emoji);
		}
	}

	if (message.content.toLowerCase().includes('twitter.com/bhagdip143')) {
		const emoji = message.guild.emojis.cache.find(emoji => emoji.name === 'baghdeep');
		if (emoji) {
			message.react(emoji);
		}
	}

	if (message.content === 'What does everyone think of bdogg?') {
		message.react('🇬')
			.then(() => message.react('🇦'))
			.then(() => message.react('🇾'))
			.catch(() => console.error('One of the emojis failed to react.'));
	}

	// Only for specific bot channels after this.
	if (!(allowedChannels.includes(message.channel.id) || message.channel.type === 'dm') || message.author.bot) return;

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
				console.log(err);
				console.log(ret);
			});
		});
	}

	if (message.content.startsWith(prefix)) {
		const args = message.content.slice(prefix.length).trim().split(/ +/);
		const commandName = args.shift().toLowerCase();

		const command = bot.commands.get(commandName)
		|| bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

		if (command) {
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
				return command.execute(teambot, message, args);
			}
			catch (error) {
				console.error(error);
				return message.reply('there was an error trying to execute that command!');
			}
		}
	}

	// Fall through to matching stocks.
	const regex = /[!|$]\w+/gm;
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

bot.on('guildMemberAdd', async member => {

	// Send the message to a designated channel on a server:
	const channel = member.guild.channels.cache.find(ch => ch.name === 'welcome-channel');
	// Do nothing if the channel wasn't found on this server
	if (!channel) return;

	try {
		await teambot.db.UserDB.upsert({
			guild: member.guild.id,
			user: member.id,
		});
	}
	catch (e) {
		if (e.name === 'SequelizeUniqueConstraintError') {
			return channel.send('That user already exists.');
		}
		return channel.send('Something went wrong with adding a user.');
	}

	const startOfDay = moment().tz('Australia/Sydney').startOf('day').tz('UTC').format('YYYY-MM-DD HH:mm:ss.SSS Z');

	const userCount = await teambot.db.UserDB.count({ where: {
		guild: member.guild.id,
		createdAt: {
			[Op.gte]: startOfDay,
		},
	} });

	const welcomes = await teambot.db.WelcomeDB.findOne({ order: Sequelize.literal('random()') });

	// Set up the welcome canvas.
	const canvas = createCanvas(700, 250);
	const ctx = canvas.getContext('2d');

	const background = await loadImage('./assets/wallpaper.jpg');
	ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

	ctx.strokeStyle = '#74037b';
	ctx.strokeRect(0, 0, canvas.width, canvas.height);

	ctx.font = '80px Lato';
	ctx.fillStyle = '#ffffff';
	ctx.fillText('ohai', canvas.width / 2.5, canvas.height / 3);
	ctx.font = applyText(canvas, member.displayName);
	ctx.fillText(`${member.displayName}!`, canvas.width / 2.5, canvas.height / 1.5);

	ctx.beginPath();
	ctx.arc(125, 125, 100, 0, Math.PI * 2, true);
	ctx.closePath();
	ctx.clip();

	console.log(member.user.displayAvatarURL({ format: 'jpg' }));
	const avatar = await loadImage(member.user.displayAvatarURL({ format: 'jpg' }));
	ctx.drawImage(avatar, 25, 25, 200, 200);

	const attachment = new MessageAttachment(canvas.toBuffer(), 'welcome-image.png');

	const users = pluralize('user', userCount);
	const have = pluralize('has', userCount);
	channel.send(`${welcomes.dataValues.welcome} ${member}. ${userCount} ${users} ${have} joined today.`, attachment);
});

const applyText = (canvas, text) => {
	const ctx = canvas.getContext('2d');

	// Declare a base size of the font
	let fontSize = 120;

	do {
		// Assign the font to the context and decrement it so it can be measured again
		ctx.font = `${fontSize -= 10}px Lato`;
		// Compare pixel width of the text to the canvas minus the approximate avatar size
	} while (ctx.measureText(text).width > canvas.width - 300);

	// Return the result to use in the actual canvas
	return ctx.font;
};

bot.login(token);

function saySomething(line) {
	allowedChannels.forEach(function(channel) {
		const chan = bot.channels.cache.get(channel);
		if (chan) {
			chan.send(`${line}`);
		}
	});
}

function randomLine() {
	(async () => {
		const botlines = await teambot.db.BotlineDB.findOne({ order: Sequelize.literal('random()') });
		saySomething(`${botlines.dataValues.botline}`);
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
			.setFooter('Found with ❤️ by TeamBot', 'https://i.imgur.com/zCl2dri.jpg');

		return message.channel.send({ embed: stockEmbed });

	})();
}

async function registerKarma(message, match) {
	const userId = match.slice(3, -2).trim().slice(0, -1);

	if (userId === message.author.id) return;

	if (match.endsWith('+')) {
		message.channel.send(`Adding karma to <@!${userId}>`);
		try {
			await teambot.db.KarmaDB.create({
				guild: message.guild.id,
				user: userId,
				karma: 1,
			});
		}
		catch (error) {
			if (error.name === 'SequelizeUniqueConstraintError') {
				await teambot.db.KarmaDB.update({ karma: teambot.db.sequelize.literal('IFNULL(karma, 0) + 1') }, { where: { user: userId } });
			}
		}
	}
	else {
		message.channel.send(`Removing karma from <@!${userId}>`);
		try {
			await teambot.db.KarmaDB.create({
				guild: message.guild.id,
				user: userId,
				karma: -1,
			});
		}
		catch (error) {
			if (error.name === 'SequelizeUniqueConstraintError') {
				await teambot.db.KarmaDB.update({ karma: teambot.db.sequelize.literal('IFNULL(karma, 0) - 1') }, { where: { user: userId } });
			}
		}
	}
}

bot.on('presenceUpdate', async (oldMember, newMember) => {
	try {
		await teambot.db.UserDB.upsert({
			guild: newMember.guild.id,
			user: newMember.userID,
		});
	}
	catch (e) {
		console.log(e);
	}

});
