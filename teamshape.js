'use strict';

const Discord = require('discord.js');
const { prefix, token, testChannel, prodChannel, allowedChannels } = require('./config.json');

const bot = new Discord.Client();

bot.once('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`);

  const test = bot.channels.cache.get(testChannel);
  if (test) {
    test.send('Ohai.');
  }

  const prod = bot.channels.cache.get(prodChannel);
  if (prod) {
    prod.send('Ohai.');
  }
});

bot.on('messageReactionAdd', (reaction, user) => {
  if (reaction.emoji.name === '👍') {
    reaction.message.react('👍')
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
  if (command === 'react') {
    message.react('😄');
  }
  if (command === 'uptime') {
    message.channel.send(`Online for ${bot.uptime} ms`);
  }

  if (command === 'fruits') {
		message.react('🍎')
			.then(() => message.react('🍊'))
			.then(() => message.react('🍇'))
			.catch(() => console.error('One of the emojis failed to react.'));
  }
  
	// other commands...
});

bot.on('guildMemberAdd', member => {
  // Send the message to a designated channel on a server:
  const channel = member.guild.channels.cache.find(ch => ch.name === 'general');
  // Do nothing if the channel wasn't found on this server
  if (!channel) return;
  // Send the message, mentioning the member
  channel.send(`Welcome to the party, ${member}`);
});

bot.login(token);
