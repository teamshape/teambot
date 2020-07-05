'use strict';

const fs = require('fs');
const got = require('got');
const moment = require('moment-timezone');
const Discord = require('discord.js');
const { token, allowedChannels, avApiKey, timer } = require('./config.json');
const { CronJob } = require('cron');
const { Sequelize, Op } = require('sequelize');
const AsyncLock = require('async-lock');

const lock = new AsyncLock();
const bot = new Discord.Client();
bot.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

const db = require('./db.js');

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	bot.commands.set(command.name, command);
}

bot.once('ready', () => {
	console.log(`Logged in as ${bot.user.tag}!`);
	saySomething('Ohai.');

	const job = new CronJob('0 * * * * *', async function() {
		const reminders = await db.RemindDB.findAll({ where: {
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
				db.RemindDB.destroy({
					where: {
						id: rm.dataValues.id,
					},
				});
			}
		});
	}, null, true, 'Australia/Sydney');
	job.start();

	const alertJob = new CronJob('0 * 10-16 * * 1-5', async function() {
		const alerts = await db.AlertDB.findAll();

		alerts.forEach(async function(a) {
			const member = a.dataValues.user;
			const stock = a.dataValues.stock;
			const operator = a.dataValues.operator;
			const price = a.dataValues.price;

			const asx = await got.get('https://www.asx.com.au/asx/1/share/' + stock).json();

			if (operator === '>' && asx.last_price >= price) {
				saySomething(`<@${member}>: ${stock} rose to/above your alert price of ${price} and is now trading at ${asx.last_price}`);
				db.AlertDB.destroy({
					where: {
						id: a.dataValues.id,
					},
				});
			}
			else if (operator === '<' && asx.last_price <= price) {
				saySomething(`<@${member}>: ${stock} dropped to/below your alert price of ${price} and is now trading at ${asx.last_price}`);
				db.AlertDB.destroy({
					where: {
						id: a.dataValues.id,
					},
				});
			}
		});


	}, null, true, 'Australia/Sydney');
	alertJob.start();

});

bot.on('messageReactionAdd', (reaction) => {
	if (reaction.emoji.name === '👍') {
		reaction.message.react('👍');
	}
});

bot.on('message', async message => {

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
	const karma = /<@!\d+>\s?\+\+|<@!\d+>\s?\-\-/gm;
	let l;

	while ((l = karma.exec(message.content)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (l.index === karma.lastIndex) {
			karma.lastIndex++;
		}
		// The result can be accessed through the `m`-variable.
		l.forEach((match, groupIndex) => {
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

	const prefix = message.content[0];
	const args = message.content.slice(prefix.length).split(/ +/);
	const commandName = args.shift().toLowerCase();

	if (bot.commands.has(commandName)) {
		const command = bot.commands.get(commandName);
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
			command.execute(db, message, args);
		}
		catch (error) {
			console.error(error);
			return message.reply('there was an error trying to execute that command!');
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
		m.forEach((match, groupIndex) => {
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
		await db.UserDB.upsert({
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

	const users = await db.UserDB.count({ where: {
		guild: member.guild.id,
		createdAt: {
			[Op.gte]: startOfDay,
		},
	} });

	const welcomes = await db.WelcomeDB.findOne({ order: Sequelize.literal('random()') });

	// Send the message, mentioning the member
	// const welcome = welcomes[Math.floor(Math.random() * welcomes.length)];

	if (users === 1) {
		channel.send(`${welcomes.dataValues.welcome} ${member}. ${users} user has joined today.`);
	}
	else {
		channel.send(`${welcomes.dataValues.welcome} ${member}. ${users} users have joined today.`);
	}
});

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
		const botlines = await db.BotlineDB.findOne({ order: Sequelize.literal('random()') });
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
	const prefix = match[0];
	const stock = match.substr(1).toUpperCase();

	(async () => {
		let request = '';
		let yahoo = '';
		let url = '';
		try {
			if (prefix === '$') {
				request = await got.get('https://www.asx.com.au/asx/1/share/' + stock).json();
				yahoo = await got.get('http://d.yimg.com/autoc.finance.yahoo.com/autoc?query=' + stock + '.ax&lang=en');
				url = 'https://www.bloomberg.com/quote/' + stock + ':AU';
			}
			else if (prefix === '!') {
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

		const stockEmbed = new Discord.MessageEmbed()
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
			await db.KarmaDB.create({
				guild: message.guild.id,
				user: userId,
				karma: 1,
			});
		}
		catch (error) {
			if (error.name === 'SequelizeUniqueConstraintError') {
				await db.KarmaDB.update({ karma: db.sequelize.literal('IFNULL(karma, 0) + 1') }, { where: { user: userId } });
			}
		}
	}
	else {
		message.channel.send(`Removing karma from <@!${userId}>`);
		try {
			await db.KarmaDB.create({
				guild: message.guild.id,
				user: userId,
				karma: -1,
			});
		}
		catch (error) {
			if (error.name === 'SequelizeUniqueConstraintError') {
				await db.KarmaDB.update({ karma: db.sequelize.literal('IFNULL(karma, 0) - 1') }, { where: { user: userId } });
			}
		}
	}
}

bot.on('presenceUpdate', async (oldMember, newMember) => {
	try {
		await db.UserDB.upsert({
			guild: newMember.guild.id,
			user: newMember.userID,
		});
	}
	catch (e) {
		console.log(e);
	}

});
