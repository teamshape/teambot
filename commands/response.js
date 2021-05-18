const { ALL } = require('../util/channels');
const { OPERATOR, ADMINISTRATOR } = require('../util/permissions');
const Discord = require('discord.js');
const emojiRegex = require('emoji-regex');
const regex = emojiRegex();

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

			responses.forEach(r => {
				const reactionEmoji = teambot.bot.emojis.cache.get(r.dataValues.response);

				let dbEmoji = '';
				if (!reactionEmoji) {
					// Is this a standard Unicode emoji?
					let match;
					match = regex.exec(r.dataValues.response);
					dbEmoji = match[0];
				}
				else {
					dbEmoji = `<:${reactionEmoji.name}:${reactionEmoji.id}>`;
				}

				if (r.dataValues.user) {
					data.push(`user: ${r.dataValues.id}: <@${r.dataValues.target}> - ${dbEmoji}`);
				}
				else if (r.dataValues.react) {
					const targetEmoji = teambot.bot.emojis.cache.get(r.dataValues.target);

					let dbTargetEmoji = '';
					if (!targetEmoji) {
						// Is this a standard Unicode emoji?
						let match;
						match = regex.exec(r.dataValues.target);	
						dbTargetEmoji = match[0];
					}
					else {
						dbTargetEmoji = `<:${targetEmoji.name}:${targetEmoji.id}>`;
					}
					data.push(`react: ${r.dataValues.id}: ${dbTargetEmoji} - ${dbEmoji}`);
				}
				else {
					data.push(`word: ${r.dataValues.id}: ${r.dataValues.target} - ${dbEmoji}`);
				}
			});

			return message.author.send(data, { split: true })
				.then(() => {
					if (message.channel.type === 'dm') return;
					return message.reply('I\'ve sent you a DM with all my responses!');
				})
				.catch(error => {
					console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
					return message.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
				});
		}
		if (args[0] === 'delete') {
			teambot.db.responses.destroy({
				where: {
					id: args[1],
				},
			});
			return message.reply(`Response #${args[1]} has been deleted.`);
		}

		const parsedEmoji = Discord.Util.parseEmoji(args[2]);
		const reactionEmoji = teambot.bot.emojis.cache.get(parsedEmoji.id);
		let dbEmoji = '';
		if (!reactionEmoji) {

			// Is this a standard Unicode emoji?
			let match;
			match = regex.exec(args[2]);
			if (!match) {
				// Nope, not on the server and not Unicode.
				return message.reply('Emoji not available on this server.');
			}

			dbEmoji = match[0];
		}
		else {
			dbEmoji = reactionEmoji.id;
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
					response: dbEmoji,
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
					response: dbEmoji,
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
			let dbReactionEmoji = '';
			if (!reactReactionEmoji) {

				// Is this a standard Unicode emoji?
				let match;
				match = regex.exec(args[2]);
				if (!match) {
					// Nope, not on the server and not Unicode.
					return message.reply('Emoji not available on this server.');
				}
	
				dbReactionEmoji = match[0];
			}
			else {
				dbReactionEmoji = reactParsedEmoji.id;
			}

			try {
				await teambot.db.responses.create({
					guild: message.guild.id,
					channel: message.channel.id,
					author: message.author.id,
					react: true,
					target: dbReactionEmoji,
					response: dbEmoji,
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