const got = require('got');

module.exports = {
	name: 'etf',
	description: 'Gets holding information about an ETF. Add .ax for Australian ETFs.',
	args: true,
	usage: '<stock>',
	async execute(teambot, message, args) {
		const etf = args[0].toUpperCase();

		try {
			const response = await got.get('https://au.finance.yahoo.com/quote/' + etf + '/holdings');

			const responseArray = (response.body.split('\n'));
			const regex = /root.App.main.*/g;
			let result;
			while((result = regex.exec(responseArray)) !== null) {
				const sanitised = result[0].slice(16).split(';,}(this));');
				const json = JSON.parse(sanitised[0]);

				const holdings = json.context.dispatcher.stores.QuoteSummaryStore.topHoldings.holdings;

				let reply = `Holdings for ${etf}:\n`;
				holdings.forEach(element => {
					reply += element.symbol + ': ' + element.holdingPercent.fmt + '\n';
					// console.log(element.symbol);
					// console.log(element.holdingPercent.fmt);
				});
				// console.log(reply);

				return message.reply(reply);


			}
		}
		catch (error) {
			return message.reply('ETF not found.');
		}
	},
};