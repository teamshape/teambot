exports.ADMINISTRATOR = 64;
exports.OPERATOR = 32;
exports.PREMIUM = 16;
exports.STANDARD = 8;
exports.PLEBIAN = 4;
exports.DOUBLEPLEBIAN = 2;
exports.NOPERMS = 0;

exports.isAdmin = function(msg) {
	if (msg >= exports.OPERATOR) {
		return true;
	}
	return false;
};
