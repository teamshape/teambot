const { Op } = require("sequelize");

module.exports = {
	name: 'manage',
	description: 'Handles user management',
	args: true,
	usage: 'setpermission <user> <permission>',
	async execute(db, message, args) {

		const ADMINISTRATOR = 64;
		const OPERATOR = 32;
		const PREMIUM = 16;
		const STANDARD = 8;
		const PLEBIAN = 4;
		const DOUBLEPLEBIAN = 2;
		const NOPERMS = 0;

		// Load user sending the command and user being acted upon.
		const commandUser = message.author.id;
		const targetUser = args[0].slice(3, -1).trim();
		const guild = message.guild.id;

		let loadedCommandUser = [];
		let loadedTargetUser = [];
			
		try {
			loadedCommandUser = await db.UserDB.findOne({ where: {
				guild: guild,
				user: commandUser
			}});
		}
		catch (e) {
			return message.reply('Something went wrong with finding your user.');
		}

		try {
			loadedTargetUser = await db.UserDB.findOne({ where: {
				guild: guild,
				user: targetUser
			}});
		}
		catch (e) {
			return message.reply('Something went wrong with finding the target user.');
		}

		if (args[1] === 'setpermission') {
		   if (loadedCommandUser.dataValues.permission === OPERATOR && loadedCommandUser.dataValues.permission > loadedTargetUser.dataValues.permission) {
				const p = args[2];
				// console.log(p);
				if (!isNaN(p) && p <= OPERATOR) {
					if (p && (p & (p - 1)) === 0) {
						await db.UserDB.update({
							permission: p
						},
						{
							where: { user: targetUser }
						});
						return message.reply('Permissions updated.');
					}
					else {
						return message.reply('Permissions integer is invalid.');
					}
				} else {
					return message.reply('Permissions integer is too damn high.');
				}
			}
			else {
				return message.reply('Your permissions are not high enough to manage this user, you must construct additional pylons.');
			}
		}
	},

};