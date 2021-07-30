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
			const response = await state.get(message.guild, key);
			return message.reply(response);
		}
		else if (command === 'set') {
			const key = args.shift().toLowerCase();
			const value = args.join();
			const response = await state.set(message.guild, key, value);
			return message.reply(response);
		}
		else if (command === 'delete') {
			const key = args.shift().toLowerCase();
			const response = await state.delete(message.guild, key);
			return message.reply(response);
		}
	},
};