const simpleGit = require('simple-git');
const git = simpleGit();

module.exports = {
	name: 'pull',
	description: 'Updates the bot',
	args: false,
	async execute(db, message, args) {

		const ADMINISTRATOR = 64;
		const OPERATOR = 32;
		const PREMIUM = 16;
		const STANDARD = 8;
		const PLEBIAN = 4;
		const DOUBLEPLEBIAN = 2;
		const NOPERMS = 0;

		const commandUser = message.author.id;
		const guild = message.guild.id;

		let loadedCommandUser = [];
		
		try {
			loadedCommandUser = await db.UserDB.findOne({ where: {
				guild: guild,
				user: commandUser,
			} });
		}
		catch (e) {
			return message.reply('Something went wrong with finding your user.');
		}

		if (loadedCommandUser.dataValues.permission >= ADMINISTRATOR) {
			require('simple-git')()
			.exec(() => console.log('Starting pull...'))
			.pull('origin', 'master', {'--rebase': 'true'}, (err, update) => {
				if(update && update.summary.changes) {
					console.log(update);
					require('child_process').exec('pm2 restart TeamBot');
					message.channel.send(`TeamBot has been updated with ${update.summary.changes} change(s), ${update.summary.insertions} insertion(s) and ${update.summary.deletions} deletion(s).`);
				}
			})
			.exec(() => console.log('pull done.'));
		};
	},
};