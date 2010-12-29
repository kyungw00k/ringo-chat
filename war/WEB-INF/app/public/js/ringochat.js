(function($) {
var ringoChat = (window.ringoChat = {
	connect: function(basePath) {
		return new Channel(basePath);
	}
});

function Channel(basePath) {
	this.basePath = basePath;
	this.gae_channel = null;
	this.socket = null;
	this.nick = null;
	bindAll(this);
}


$.extend(Channel.prototype, {
	pollingErrors: 0,
	lastMessageId: 0,
	id: null,
	
	request: function(url, options) {
		var channel = this;
		$.ajax($.extend({
			url: this.basePath + url,
			cache: false,
			dataType: "json"
		}, options));
	},
	
	poll: function() {
		if (this.pollingErrors > 2) {
			$(this).triggerHandler("connectionerror");
			return;
		}
		var channel = this;
		this.request("/recv", {
			data: {
				since: this.lastMessageId,
				id: this.id
			},
			success: function(data) {
				if (data) {
					channel.handlePoll(data);
				} else {
					channel.handlePollError();
				}
			},
			error: this.handlePollError
		});
	},
	
	handlePoll: function(data) {
		this.pollingErrors = 0;
		var channel = this;
		if (data && data.messages) {
			$.each(data.messages, function(i, message) {
				channel.lastMessageId = Math.max(channel.lastMessageId, message.id);
				$(channel).triggerHandler(message.type, message);
			});
		}
		if ( this.nick == null ) {
			window.location = '/';
		}
		// this.poll();
	},
	
	handlePollError: function() {
		 this.pollingErrors++;
		 setTimeout(this.poll, 10*1000);
	}
});

$.extend(Channel.prototype, {
	join: function(nick, options) {
		var channel = this;
		this.request("/join", {
			type : "POST",
			data: {
				nick: nick
			},
			success: function(data) {
				if (!data) {
					(options.error || $.noop)();
					return;
				}
				channel.id = data.id;
				channel.nick = nick;
				channel.since = data.since;
				channel.poll();
				
				var message = $("#message");
				message.val("Connecting....").attr("disabled", true);
				/*
				 * AppEngine Channel 
				 */
				channel.gae_channel = new goog.appengine.Channel(data.channel_id),
				channel.socket = channel.gae_channel.open();
				
				channel.socket.onopen = function () {
					message.val("").removeAttr("disabled").focus();
				};
				channel.socket.onmessage = function(evt) {
					var data = eval('(' + evt.data + ')')

					if (data) {
						channel.handlePoll(data);
					} else {
						channel.handlePollError();
					}
				};
				channel.socket.onerror = function() {
					channel.nick = null;
					alert("Connection Error!");
					message.val("Connection Error!").attr("disabled", true);
					window.location = '/';
				};
				channel.socket.onclose = function() {
					channel.nick = null;
					alert("Session Timeout!");
					message.val("Session Timeout!").attr("disabled", true);
					window.location = '/';
				};
				
				(options.success || $.noop)();
			},
			error: options.error || $.noop
		});
	},
	
	part: function() {
		if (!this.id) { return; }
		this.request("/part", {
			data: { id: this.id },
			success: function(data) {
				message.val("Closed Session").attr("disabled", true);
				window.location = '/';
			}
		});
		this.nick = null;
	},
	
	send: function(msg) {
		if (!this.id) { return; }
		this.request("/send", {
			type : "POST",
			data: {
				id: this.id,
				text: msg
			}
		});
	},
	
	who: function() {
		if (!this.id) { return; }
		this.request("/who", {
			success: function(data) {
				var users = $("#users");
				$.each(data.nicks, function(i, nick) {
					users.append("<li>" + nick + "</li>");
				});
			}
		});
	}
});

function bind(fn, context) {
	return function() {
		return fn.apply(context, arguments);
	};
}
function bindAll(obj) {
	for (var prop in obj) {
		if ($.isFunction(obj[prop])) {
			obj[prop] = bind(obj[prop], obj);
		}
	}
}

})(jQuery);
