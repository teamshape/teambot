module.exports = {
	apps : [{
		name: 'TeamBot',
		script: 'teambot.js',
		exp_backoff_restart_delay: 100,
		watch: false,
		time: true,
		env: {
			NODE_ENV: 'development',
		},
		env_production: {
			NODE_ENV: 'production',
		},
	}],
};
