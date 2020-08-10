const pluralize = require('pluralize');
const { ADMINISTRATOR } = require('../permissions');

module.exports = {
	name: 'pull',
	description: 'Updates the bot',
	args: false,
	permission: ADMINISTRATOR,
	async execute(teambot, message) {

		require('simple-git')()
			.exec(() => console.log('Starting pull...'))
			.pull('origin', 'master', { '--rebase': 'true' }, (err, update) => {
				if (update && update.summary.changes) {
					console.log(update);
					require('child_process').exec('npm install');
					require('child_process').exec('pm2 restart TeamBot');
					message.channel.send(`TeamBot has been updated with ${update.summary.changes} ${pluralize('change', update.summary.changes)}, ${update.summary.insertions} ${ pluralize('insertion', update.summary.insertions)} and ${update.summary.deletions} ${ pluralize('deletion', update.summary.deletions)}.`);
				}
				else {
					message.channel.send('No updates available.');
				}
			})
			.exec(() => console.log('Pull complete.'));
	},
};