exports.ADMINISTRATOR = 64;
exports.OPERATOR = 32;
exports.TRUSTED = 16;
exports.PREMIUM = 8;
exports.STANDARD = 4;
exports.PLEBIAN = 2;
exports.NOPERMS = 0;

exports.isAdmin = function(permission) {
	if (permission >= exports.ADMINISTRATOR) {
		return true;
	}
	return false;
};

exports.isMod = function(permission) {
	if (permission >= exports.OPERATOR) {
		return true;
	}
	return false;
};

exports.isTrusted = function(permission) {
	if (permission >= exports.TRUSTED) {
		return true;
	}
	return false;
};
