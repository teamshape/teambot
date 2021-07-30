const { ALL } = require('../util/channels');
const { ADMINISTRATOR } = require('../util/permissions');
const state = require('../util/state');

module.exports = {
	name: 'state',
	description: 'Handles state management',
	args: true,
	usage: 'set <key> <value> | get <key> | delete <key> ',
	permission: ADMINISTRATOR,
	channel: ALL,
	async execute(teambot, message, args) {
		const command = args.shift();
		if (command === 'get') {
			const key = args.shift().toLowerCase();
			const value = await state.get(message.guild, key);
			if (value) {
				return message.reply(`Key [${key}] is set to [${value}].`);
			}
			return message.reply(`Error getting key [${key}].`);
		}
		else if (command === 'set') {
			const key = args.shift().toLowerCase();
			const value = args.join();
			if(await state.set(message.guild, key, value)) {
				return message.reply(`Key [${key}] is set to [${value}].`);
			}
			return message.reply(`Error setting key [${key}] to value [${value}].`);
		}
		else if (command === 'delete') {
			const key = args.shift().toLowerCase();
			if(await state.delete(message.guild, key)) {
				return message.reply(`Key [${key}] has been deleted.`);
			}
			return message.reply(`Error delete key [${key}].`);
		}
	},
};