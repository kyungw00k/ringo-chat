var EventEmitter = require("ringo/events").EventEmitter,
	Session = require("./session").Session,
	channelService = require('google/appengine/api/channel'),
	taskqueue = require('google/appengine/api/taskqueue');

function Channel(options) {
	EventEmitter.call(this);
	
	if (!options || !options.basePath) {
		return false;
	}
	
	this.basePath = options.basePath;
	this.messageBacklog = parseInt(options.messageBacklog) || 200;
	this.sessionTimeout = (parseInt(options.sessionTimeout) || 60) * 1000;
	
	this.nextMessageId = 0;
	this.messages = [];
	this.callbacks = [];
	this.sessions = {};
	
	var channel = this;
	taskqueue.add({url: "/chat/flush", method: "GET", eta : 2000});
}

inherits(Channel, EventEmitter);

extend(Channel.prototype, {
	serialize : function () {
		return {
			nextMessageId : this.nextMessageId,
			messages : this.messages,
			callbacks : this.callbacks,
			sessions : this.sessions
		};
	},
	deserialize : function(obj) {
		sys.print("Fetch from memcache");
		
		this.nextMessageId = obj.nextMessageId;
		this.messages = obj.messages;
		this.callbacks = obj.callbacks;
		this.sessions = obj.sessions;
		
		return this;
	},
	appendMessage: function(nick, type, text) {
		var id = ++this.nextMessageId,
			message = {
				id: id,
				nick: nick,
				type: type,
				text: text,
				timestamp: (new Date()).getTime()
			};
		this.messages.push(message);
		this.emit(type, message);
		
		while (this.callbacks.length > 0) {
			this.callbacks.shift().callback([message]);
		}
		
		while (this.messages.length > this.messageBacklog) {
			this.messages.shift();
		}
		var sessions = this.sessions;

		for ( var key in sessions ) {
			if ( sessions[key] ) {
				// sys.print("Send Message : "+JSON.stringify(message));
				channelService.sendMessage(encodeURIComponent(sessions[key].nick), "{messages : ["+ JSON.stringify(message) + "]}");				
			}
		}
		return id;
	},
	
	query: function(since, callback) {
		var matching = [],
			length = this.messages.length;
		for (var i = 0; i < length; i++) {
			if (this.messages[i].id > since) {
				matching = this.messages.slice(i);
				break;
			}
		}
		
		if (matching.length) {
			callback(matching);
		} else {
			this.callbacks.push({
				timestamp: new Date(),
				callback: callback
			});
		}
	},
	
	flushCallbacks: function() {
		var now = new Date();
		while (this.callbacks.length && now - this.callbacks[0].timestamp > this.sessionTimeout * 0.75) {
			this.callbacks.shift().callback([]);
		}
	},
	
	createSession: function(nick) {
		this.flushCallbacks();
		this.expireOldSessions();

		var session = new Session(nick);
		if (!session) {
			return;
		}
		
		nick = nick.toLowerCase();
		for (var i in this.sessions) {
			if (this.sessions[i].nick && this.sessions[i].nick.toLowerCase() === nick) {
				return;
			}
		}
		this.sessions[session.id] = session;
		session.token = channelService.createChannel(encodeURIComponent(nick));
		session.since = this.appendMessage(nick, "join");
		return session;
	},
	
	destroySession: function(id) {
		if (!id || !this.sessions[id]) {
			return false;
		}
		
		var eventId = this.appendMessage(this.sessions[id].nick, "part");
		delete this.sessions[id];
		return eventId;
	},
	
	expireOldSessions: function() {
		var now = new Date();
		for (var session in this.sessions) {
			if (now - this.sessions[session].timestamp > this.sessionTimeout) {
				this.destroySession(session);
			}
		}
	}
});

exports.Channel = Channel;

function extend(obj, props) {
	for (var prop in props) {
		obj[prop] = props[prop];
	}
}

function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false
        }
    });
}