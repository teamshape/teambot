const { BOTCHANNEL } = require('../util/channels');
const { ADMINISTRATOR, OPERATOR, TRUSTED, PREMIUM, STANDARD, PLEBIAN } = require('../util/permissions');
const { wordnikApiKey } = require('../config/teambot.json');
const got = require('got');

module.exports = {
	name: 'wotd',
	description: 'Gets the word of the day',
	aliases: ['word'],
	args: false,
	permission: ADMINISTRATOR | OPERATOR | TRUSTED | PREMIUM | STANDARD | PLEBIAN,
	channel: BOTCHANNEL,
	async execute(teambot, message) {

		try {
			const response = await got.get('https://api.wordnik.com/v4/words.json/wordOfTheDay?api_key=' + wordnikApiKey);

			if (response.body) {
				const json = JSON.parse(response.body);
				let reply = 'Word of the day: ' + json.word + '\n';

				json.definitions.forEach(definition => {
					reply += '- ' + definition.text + '\n';
				});
				return message.reply(reply);
			}
		}
		catch (error) {
			return message.reply('Problem calling word of the day API.');
		}
	},
};