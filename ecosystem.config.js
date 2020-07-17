module.exports = {
	apps : [{
		name: 'TeamBot',
		script: 'teambot.js',
		env: {
			NODE_ENV: 'development',
			watch: '.',
		},
		env_production: {
			NODE_ENV: 'production',
		},
	}],
};
