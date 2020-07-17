const pluralize = require('pluralize');

module.exports = {
	name: 'pull',
	description: 'Updates the bot',
	args: false,
	async execute(teambot, message) {

		const commandUser = message.author.id;
		const guild = message.guild.id;

		let loadedCommandUser = [];

		try {
			loadedCommandUser = await teambot.db.UserDB.findOne({ where: {
				guild: guild,
				user: commandUser,
			} });
		}
		catch (e) {
			return message.reply('Something went wrong with finding your user.');
		}

		if (teambot.permissions.isAdmin(loadedCommandUser.dataValues.permission)) {
			require('simple-git')()
				.exec(() => console.log('Starting pull...'))
				.pull('origin', 'master', { '--rebase': 'true' }, (err, update) => {
					if (update && update.summary.changes) {
						console.log(update);
						require('child_process').exec('npm install');
						require('child_process').exec('pm2 restart TeamBot');
						message.channel.send(`TeamBot has been updated with ${update.summary.changes} ${pluralize('change', update.summary.changes)} change(s), ${update.summary.insertions} ${ pluralize('update', update.summary.insertions)} insertion(s) and ${update.summary.deletions} ${ pluralize('deletion', update.summary.deletions)} deletion(s).`);
					}
					else {
						message.channel.send('No updates available.');
					}
				})
				.exec(() => console.log('Pull complete.'));
		}
	},
};