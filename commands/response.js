const { ALL } = require('../util/channels');
const { OPERATOR, ADMINISTRATOR } = require('../util/permissions');
const Discord = require('discord.js');

module.exports = {
	name: 'response',
	description: 'Handles response management',
	args: true,
	usage: 'response <type> <target> <reaction>',
	permission: ADMINISTRATOR | OPERATOR,
	channel: ALL,
	async execute(teambot, message, args) {

		const guild = message.guild.id;

		if (args[0] === 'list') {
			const responses = await teambot.db.responses.findAll();
			const data = [];
			data.push('Here\'s a list of all responses:');
			data.push(responses.map(response => `${response.id}: ${response.target} - ${response.response}`).join('\n'));

			return message.author.send(data, { split: true })
				.then(() => {
					if (message.channel.type === 'dm') return;
					message.reply('I\'ve sent you a DM with all my responses!');
				})
				.catch(error => {
					console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
					message.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
				});
		}
		if (args[0] === 'delete') {
			teambot.db.responses.destroy({
				where: {
					id: args[1],
				},
			});
			message.reply(`Response #${args[1]} has been deleted.`);
		}

		const parsedEmoji = Discord.Util.parseEmoji(args[2]);
		const reactionEmoji = teambot.bot.emojis.cache.get(parsedEmoji.id);
		if (!reactionEmoji) {
			return message.reply('Emoji not available on this server.');
		}

		if (args[0] === 'user') {
			const targetUser = args[1].slice(3, -1).trim();
			try {
				loadedTargetUser = await teambot.db.users.findOne({ where: {
					guild: guild,
					user: targetUser,
				} });
			}
			catch (e) {
				return message.reply('Something went wrong with finding the target user.');
			}

			try {
				await teambot.db.responses.create({
					guild: message.guild.id,
					channel: message.channel.id,
					author: message.author.id,
					user: true,
					target: args[1].slice(3, -1).trim(),
					response: reactionEmoji.id,
				});
				return message.reply('Response added.');
			}
			catch (e) {
				if (e.name === 'SequelizeUniqueConstraintError') {
					return message.reply('That response already exists.');
				}
				return message.reply('Something went wrong with adding a response.');
			}
		}

		if (args[0] === 'word') {
			try {
				await teambot.db.responses.create({
					guild: message.guild.id,
					channel: message.channel.id,
					author: message.author.id,
					word: true,
					target: args[1],
					response: reactionEmoji.id,
				});
				return message.reply('Response added.');
			}
			catch (e) {
				if (e.name === 'SequelizeUniqueConstraintError') {
					return message.reply('That response already exists.');
				}
				return message.reply('Something went wrong with adding a response.');
			}
		}

		if (args[0] === 'react') {
			const reactParsedEmoji = Discord.Util.parseEmoji(args[1]);
			const reactReactionEmoji = teambot.bot.emojis.cache.get(reactParsedEmoji.id);
			if (!reactReactionEmoji) {
				return message.reply('Emoji not available on this server.');
			}
			try {
				await teambot.db.responses.create({
					guild: message.guild.id,
					channel: message.channel.id,
					author: message.author.id,
					react: true,
					target: reactReactionEmoji.id,
					response: reactionEmoji.id,
				});
				return message.reply('Response added.');
			}
			catch (e) {
				if (e.name === 'SequelizeUniqueConstraintError') {
					return message.reply('That response already exists.');
				}
				return message.reply('Something went wrong with adding a response.');
			}
		}


	},

};