function Session(nick) {
	if (nick.length > 50) {
		return;
	}
	if (!/^[a-zA-Z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+$/.test(nick)) {
		return;
	}
	
	this.token = null;
	this.nick = nick;
	this.id = Math.floor(Math.random() * 1e10).toString();
	this.timestamp = (new Date()).getTime();
}

Session.prototype.poke = function() {
	this.timestamp = (new Date()).getTime();
};

Session.prototype.deserialize = function (obj) {
	this.token = obj.token;
	this.nick = obj.nick;
	this.id = obj.id;
	this.timestamp = obj.timestamp;
};

exports.Session = Session;