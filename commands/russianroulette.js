module.exports = {
	name: 'russianroulette',
	aliases: ['rr'],
	description: 'Plays with fire.',
	async execute(teambot, message) {

		let shots = null;
		try {
			shots = await teambot.db.KvDB.findOne({ where: {
				guild: message.guild.id,
				key: 'rr.shots',
			} });
		}
		catch (e) {
			return message.reply('Error getting value.');
		}

		// Seed the table.
		if (shots === null) {
			try {
				await teambot.db.KvDB.create({
					guild: message.guild.id,
					key: 'rr.shots',
					value: 6,
				});
			}
			catch (error) {
				if (error.name === 'SequelizeUniqueConstraintError') {
					return message.reply('Duplicate entry in the table.');
				}
			}
		}

		let chance = shots.dataValues.value;

		if (Math.floor(Math.random() * chance) === 0) {
			try {
				await teambot.db.KvDB.update({
					value: 6,
				},
				{
					where: {
						guild: message.guild.id,
						key: 'rr.shots',
					},
				});
			}
			catch (e) {
				console.log(e);
			}
			return message.channel.send('BANG!');
		}
		else {
			chance -= 1;
			try {
				await teambot.db.KvDB.update({
					value: chance,
				},
				{
					where: {
						guild: message.guild.id,
						key: 'rr.shots',
					},
				});
			}
			catch (e) {
				console.log(e);
			}
			return message.channel.send('Click.');
		}
	},
};