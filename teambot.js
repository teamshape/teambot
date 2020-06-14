'use strict';

const got = require('got');
const human = require('interval-to-human');
const Discord = require('discord.js');
const { prefix, token, allowedChannels } = require('./config.json');

const bot = new Discord.Client();

bot.once('ready', () => {
	console.log(`Logged in as ${bot.user.tag}!`);

	allowedChannels.forEach(function(channel) {
		let chan = bot.channels.cache.get(channel);
		if (chan) {
			chan.send('Ohai.');
		}
	})
});

bot.on('messageReactionAdd', (reaction) => {
	if (reaction.emoji.name === '👍') {
		reaction.message.react('👍');
	}
});

bot.on('message', message => {

	if (message.content === 'What does everyone think of bdogg?') {
		message.react('🇬')
			.then(() => message.react('🇦'))
			.then(() => message.react('🇾'))
			.catch(() => console.error('One of the emojis failed to react.'));
	}

	if (!allowedChannels.includes(message.channel.id) || !message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).split(/ +/);
	const command = args.shift().toLowerCase();

	if (command === 'ping') {
		message.channel.send('Pong.');
	}
	// if (command === 'react') {
	//   message.react('😄');
	// }
	if (command === 'uptime') {
		let uptime = human(bot.uptime);
		message.channel.send(`Online for ${uptime}`);
	}
	if (command === 'stock') {
		const stock = args.shift().toUpperCase();

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
	channel.send(`Welcome to the party, ${member}.`);
});


bot.login(token);
