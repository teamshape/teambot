const Sequelize = require('sequelize');
const got = require('got');

module.exports = {
	name: 'alert',
	description: 'Sets a price alert for rising and falling stocks on the ASX.',
	args: true,
	usage: '<stock> <operator> <price>',
	async execute(db, message, args) {
		const stock = args[0];
		const operator = args[1];
		const price = parseFloat(args[2]);

		let asx = '';
		try {
			asx = await got.get('https://www.asx.com.au/asx/1/share/' + stock).json();
		}
		catch (error) {
			return message.reply('Stock not found.');
		}

		if (operator !== '>' && operator !== '<') {
			return message.reply('Operator should be > or <.');
		}

		// If operator is greater than and stockprice already over price
		// OR if operator is less than and stockprice already under price.
		if (operator === '>' && asx.last_price >= price) {
			return message.reply(`Stock price for ${stock} is already at/above ${price} at ${asx.last_price}.`);
		}
		else if (operator === '<' && asx.last_price <= price) {
			return message.reply(`Stock price for ${stock} is already at/beneath ${price} at ${asx.last_price}.`);
		}

		try {
			await db.AlertDB.create({
				guild: message.guild.id,
				channel: message.channel.id,
				user: message.author.id,
				stock: stock,
				operator: operator,
				price: price,
			});
			return message.reply('Alert added.');
		}
		catch (e) {
			if (e.name === 'SequelizeUniqueConstraintError') {
				return message.reply('That alert already exists.');
			}
			return message.reply('Something went wrong with adding an alert.');
		}	},
};