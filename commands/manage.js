const { OPERATOR, ADMINISTRATOR } = require('../permissions');

module.exports = {
	name: 'manage',
	description: 'Handles user management',
	args: true,
	usage: 'setpermission <user> <permission>',
	permission: ADMINISTRATOR | OPERATOR,
	async execute(teambot, message, args) {

		// Load user sending the command and user being acted upon.
		const targetUser = args[1].slice(3, -1).trim();
		const guild = message.guild.id;
		let loadedTargetUser = [];

		try {
			loadedTargetUser = await teambot.db.users.findOne({ where: {
				guild: guild,
				user: targetUser,
			} });
		}
		catch (e) {
			return message.reply('Something went wrong with finding the target user.');
		}

		if (args[0] === 'setpermission') {
			if (teambot.permissions.isMod(teambot.user.dataValues.permission) && teambot.user.dataValues.permission > loadedTargetUser.dataValues.permission) {
				const p = args[2];
				if (!isNaN(p) && p <= teambot.permissions.OPERATOR) {
					if (p && (p & (p - 1)) === 0) {
						await teambot.db.users.update({
							permission: p,
						},
						{
							where: { user: targetUser },
						});
						return message.reply('Permissions updated.');
					}
					else {
						return message.reply('Permissions integer is invalid.');
					}
				}
				else {
					return message.reply('Permissions integer is too damn high.');
				}
			}
			else {
				// return message.reply('Your permissions are not high enough to manage this user, you must construct additional pylons.');
			}
		}
	},

};