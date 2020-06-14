'use strict';

const got = require('got');
const cron = require('cron').CronJob;
const human = require('interval-to-human');
const dateparser = require('dateparser');
const Discord = require('discord.js');
const Sequelize = require('sequelize');
const { prefixes, token, allowedChannels, welcomes, avApiKey } = require('./config.json');
const { CronJob } = require('cron');

const bot = new Discord.Client();

const sequelize = new Sequelize('database', null, null, {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'db/teambot.sqlite',
});

const RemindDB = sequelize.define('reminders', {
	id: {
		type: Sequelize.INTEGER,
		unique: true,
		primaryKey: true,
	},
	guild: Sequelize.STRING,
	channel: Sequelize.STRING,
	reminder_timestamp: {
		type: Sequelize.DATE
	},
	user: Sequelize.STRING,
	reminder: Sequelize.STRING,
});

bot.once('ready', () => {
	RemindDB.sync();
	// AlertDB.sync();
	console.log(`Logged in as ${bot.user.tag}!`);

	allowedChannels.forEach(function(channel) {
		let chan = bot.channels.cache.get(channel);
		if (chan) {
			chan.send('Ohai.');
		}
	})

	const { Op } = require('sequelize')
	let job = new CronJob('0 * * * * *', async function() {
		const reminders = await RemindDB.findAll({ where: {
			reminder_timestamp: {
				 [Op.lte]: Date.now()
			}
		}});

		reminders.forEach(function(rm) {
			let reminder_channel = bot.channels.cache.get(rm.dataValues.channel);
			let member = rm.dataValues.user;
			let reminder_message = rm.dataValues.reminder;
			if (reminder_channel) {
				reminder_channel.send(`<@${member}>: ${reminder_message}`);
				RemindDB.destroy({
					where: {
						id: rm.dataValues.id
					}
				})
			}
		});
	}, null, true, 'UTC');
	job.start();

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

	if (message.content === 'What does everyone think of bdogg?') {
		message.react('🇬')
			.then(() => message.react('🇦'))
			.then(() => message.react('🇾'))
			.catch(() => console.error('One of the emojis failed to react.'));
	}

	if (!allowedChannels.includes(message.channel.id) || prefixes.indexOf(message.content.charAt(0)) < 0 || message.author.bot) return;

	const prefix = message.content[0];
	const args = message.content.slice(prefix.length).split(/ +/);
	const command = args.shift().toLowerCase();

	if (prefix === '!') {
		if (command === 'ping') {
			message.channel.send('Pong.');
		}
		else if (command === 'uptime') {
			let uptime = human(bot.uptime);
			message.channel.send(`Online for ${uptime}.`);
		}
		else if (command === 'remindme') {
			// !remind me in {time increments} to {message}
			let myMessage = args.slice(1).join(" ").split(/ to (.+)?/, 2);
			let timestamp = Date.now() + dateparser.parse(myMessage[0]).value;
			let reminder = myMessage[1];

			try {
				const remind = await RemindDB.create({
					guild: message.guild.id,
					channel: message.channel.id,
					reminder_timestamp: timestamp,
					user: message.author.id,
					reminder: reminder,
				});
				return message.reply(`Reminder added.`);
			} catch (e) {
				if (e.name === 'SequelizeUniqueConstraintError') {
					return message.reply('That reminder already exists.');
				}
				return message.reply('Something went wrong with adding a reminder.');
			}
		}
		else {
			// Fall through to looking up US stocks.
			const stock = command.toUpperCase();
			(async () => {
				const avRequest = await got.get('https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=' + stock + '&apikey=' + avApiKey).json();
				const yahoo = await got.get('http://d.yimg.com/autoc.finance.yahoo.com/autoc?query=' + stock + '&lang=en');

				let av = avRequest['Global Quote'];
				const yahooBody = yahoo.body;
				const yahooJson = JSON.parse(yahooBody);
				const stockName = yahooJson.ResultSet.Result[0].name;

				let thumbnail = 'https://i.imgur.com/zCl2dri.jpg';
				let color = '0x0099ff';
				if (av['05. price'] > av['08. previous close']) {
					thumbnail = 'https://i.imgur.com/RfWldqJ.png';
					color = '#64876f';
				}
				else if (av['05. price'] < av['08. previous close']) {
					thumbnail = 'https://i.imgur.com/mjjZD7d.jpg';
					color = '#d44942';
				}

				const stockEmbed = new Discord.MessageEmbed()
					.setColor(color)
					.setTitle(stockName)
					.setURL('https://www.bloomberg.com/quote/' + stock + ':US')
					.setAuthor('TeamBot', 'https://i.imgur.com/zCl2dri.jpg', 'https://github.com/teamshape/teambot')
					.setThumbnail(thumbnail)
					.addFields(
						{ name: 'Price', value: av['05. price'] },
						{ name: 'High', value: av['03. high'], inline: true },
						{ name: 'Low', value: av['04. low'], inline: true },
						{ name: 'Open', value: av['02. open'], inline: true },
						{ name: 'Change $', value: av['09. change'], inline: true },
						{ name: 'Change %', value: av['10. change percent'], inline: true },
						{ name: 'Previous close', value: av['08. previous close'], inline: true },
					)
					.setTimestamp()
					.setFooter('Found with ❤️ by TeamBot', 'https://i.imgur.com/zCl2dri.jpg');

				message.channel.send({ embed: stockEmbed });
			})();
		}

		// if (command === 'alert') {
		// 	// !alert CBA below 39.8
		// 	let stock = args[0];
		// 	let operator = args[1];
		// 	let price = args[2];

		// 	try {
		// 		const remind = await AlertDB.create({
		// 			guild: message.guild.id,
		// 			channel: message.channel.id,
		// 			user: message.author.id,
		// 			stock: stock,
		// 			operator: operator,
		// 			price: price
		// 		});
		// 		return message.reply(`Alert added.`);
		// 	} catch (e) {
		// 		if (e.name === 'SequelizeUniqueConstraintError') {
		// 			return message.reply('That alert already exists.');
		// 		}
		// 		return message.reply('Something went wrong with adding an alert.');
		// 	}
		// }
	}
	if (prefix === '$') {
		const stock = command.toUpperCase();

		(async () => {
			const asx = await got.get('https://www.asx.com.au/asx/1/share/' + stock).json();
			const yahoo = await got.get('http://d.yimg.com/autoc.finance.yahoo.com/autoc?query=' + stock + '.ax&lang=en');

			const yahooBody = yahoo.body;
			const yahooJson = JSON.parse(yahooBody);
			const stockName = yahooJson.ResultSet.Result[0].name;

			let thumbnail = 'https://i.imgur.com/zCl2dri.jpg';
			let color = '0x0099ff';
			if (asx.last_price > asx.previous_close_price) {
				thumbnail = 'https://i.imgur.com/RfWldqJ.png';
				color = '#64876f';
			}
			else if (asx.last_price < asx.previous_close_price) {
				thumbnail = 'https://i.imgur.com/mjjZD7d.jpg';
				color = '#d44942';
			}

			const stockEmbed = new Discord.MessageEmbed()
				.setColor(color)
				.setTitle(stockName)
				.setURL('https://www.bloomberg.com/quote/' + stock + ':AU')
				.setAuthor('TeamBot', 'https://i.imgur.com/zCl2dri.jpg', 'https://github.com/teamshape/teambot')
				.setThumbnail(thumbnail)
				.addFields(
					{ name: 'Price', value: asx.last_price },
					{ name: 'High', value: asx.day_high_price, inline: true },
					{ name: 'Low', value: asx.day_low_price, inline: true },
					{ name: 'Open', value: asx.open_price, inline: true },
					{ name: 'Change $', value: asx.change_price, inline: true },
					{ name: 'Change %', value: asx.change_in_percent, inline: true },
					{ name: 'Previous close', value: asx.previous_close_price, inline: true },
				)
				.setTimestamp()
				.setFooter('Found with ❤️ by TeamBot', 'https://i.imgur.com/zCl2dri.jpg');

			message.channel.send({ embed: stockEmbed });
		})();

	}

});

bot.on('guildMemberAdd', member => {
	// Send the message to a designated channel on a server:
	const channel = member.guild.channels.cache.find(ch => ch.name === 'welcome-channel');
	// Do nothing if the channel wasn't found on this server
	if (!channel) return;
	// Send the message, mentioning the member
	let welcome = welcomes[Math.floor(Math.random() * welcomes.length)];
	channel.send(`${welcome} ${member}.`);
});


bot.login(token);
