const { BOTCHANNEL } = require('../util/channels');
const { ADMINISTRATOR, OPERATOR, TRUSTED, PREMIUM, STANDARD } = require('../util/permissions');

module.exports = {
	name: 'avatar',
	description: 'Get the avatar URL of the tagged user(s), or your own avatar.',
	aliases: ['icon', 'pfp', 'a'],
	permission: ADMINISTRATOR | OPERATOR | TRUSTED | PREMIUM | STANDARD,
	channel: BOTCHANNEL,
	async execute(teambot, message) {
		if (!message.mentions.users.size) {
			return message.channel.send(`${message.author.displayAvatarURL({ dynamic: true, format: 'png' })}`);
		}

		const avatarList = message.mentions.users.map(user => {
			return `${user.displayAvatarURL({ dynamic: true })}`;
		});

		message.channel.send(avatarList);
	},
};