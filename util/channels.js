const { allowedChannels, botChannel } = require('../config/teambot.json');

exports.ALL = 64;
exports.ALLOWEDCHANNELS = 32;
exports.BOTCHANNEL = 16;

exports.canCommandRun = function(command, channel) {
	// Returns true if this is a channel that the bot is in.
	if (command.channel === exports.ALL) {
		return true;
	}
	// Returns true if this is in an allowed channel the bot can specifically respond in.
	else if (command.channel === exports.ALLOWEDCHANNELS && allowedChannels.indexOf(channel)) {
		return true;
	}
	// Returns true if this is the bot channel.
	else if (command.channel === exports.BOTCHANNEL && channel === botChannel) {
		return true;
	}
	return false;
}
