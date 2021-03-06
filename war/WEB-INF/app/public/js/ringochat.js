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
		this.nick = null;
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
					if (data && data.messages) {
						$.each(data.messages, function(i, message) {
							if (message.type === 'part' && message.nick == channel.nick ) {
								channel.socket.close();
								channel.nick = null;
								window.location = '/';
							}
						});
					}
				};
				channel.socket.onerror = function() {
					message.val("Connection Error").attr("disabled", true);
					window.location = '/';
				};
				channel.socket.onclose = function() {
					message.val("Connection Close").attr("disabled", true);
				};
				channel.poll();
				
				(options.success || $.noop)();
			},
			error: options.error || $.noop
		});
	},
	
	part: function() {
		if (!this.id) { return; }
		var channel = this;
		this.request("/part", {
			data: { id: this.id }
		});
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
