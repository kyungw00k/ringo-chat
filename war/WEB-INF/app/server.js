var sys = require("system"),
	Channel = require('./channel').Channel;

function Server() {
	this.channels = [];
}

extend(Server.prototype, {
	addChannel: function(options) {
		var channel = new Channel(options);
		
		if (!channel) {
			return false;
		}
		
		this.channels.push(channel);
		return channel;
	},
	serialize : function() {
		var data = {channels : []};
		for ( var idx = 0, len = this.channels.length ; idx < len ; idx++ ) {
			data.channels.push(this.channels[idx].serialize());
		}
		return JSON.stringify(data);
	},
	deserialize : function(obj) {
		sys.print("obj");
		this.channels = [];
		var data = eval("("+obj+")");
		for ( var idx = 0, len = data.channels.length ; idx < len ; idx++ ) {
			this.channels.push(new Channel({basePath: "/chat"}).deserialize(obj));
		}
	}
});

function extend(obj, props) {
	for (var prop in props) {
		obj[prop] = props[prop];
	}
}

exports.createServer = function(obj) {
	var server = new Server();
	if (obj && typeof cache == "String") {
		server.deserialize(obj);
	}
	return server;
};