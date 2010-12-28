var {Response} = require('ringo/webapp/response'),
	Channel = require('./channel').Channel,
	taskqueue = require('google/appengine/api/taskqueue'),
	sys = require('system'),
	chat = require('./server'),
	Session = require('./session'),
	memcache = require("google/appengine/api/memcache");

/*
 * Response.json with Status Code
 */
Response.jsons = function (status, object) {
    var res = new Response(JSON.stringify(object));
    res.contentType = 'application/json';
    res.status = status;
    return res;
};

var singletonChannel = chat.createServer().addChannel({basePath: "/chat"});

/*
 * Set Channel Listener
 */
singletonChannel.addListener("msg", function(msg) {
	memcache.set("channelInfo", singletonChannel.serialize()); // Memorized Previous Data to Memcache
	sys.print("<" + msg.nick + "> " + msg.text);
}).addListener("join", function(msg) {
	memcache.set("channelInfo", singletonChannel.serialize()); // Memorized Previous Data to Memcache
	sys.print("<" + msg.nick + "> join");
}).addListener("part", function(msg) {
	memcache.set("channelInfo", singletonChannel.serialize()); // Memorized Previous Data to Memcache
	sys.print("<" + msg.nick + "> part");
});

function getChannel() {
	var channelCache = memcache.get("channelInfo");
	
	if ( !channelCache ) {
		memcache.set("channelInfo", singletonChannel.serialize());
	} else {
		singletonChannel.deserialize(channelCache);
	}	
	return singletonChannel;
}

/*
 * Routing
 */
exports.who = function(request) {
	var nicks = [],
		channel = getChannel();
	for (var id in channel.sessions) {
		nicks.push(channel.sessions[id].nick);
	}
	return Response.json({ nicks: nicks });
};

exports.part = function(request) {
	var id = request.queryParams.id;
	var eventId = getChannel().destroySession(id);
	return Response.json({ id: eventId });
};

exports.join = {
	POST : function(request) {
		var nick = request.postParams.nick;

		if (!nick) {
			return Response.jsons(400, { error: "bad nick." });
		}
		var session = getChannel().createSession(nick);
		if (!session) {
			return Response.jsons(400, { error: "nick in use." });
		}
		
		var message = { id: session.id, nick: nick, since: session.since, channel_id : session.token};
		return Response.json(message);
	}
};

exports.recv = function(request) {
	var channel = getChannel(),
		query = request.queryParams,
		since = parseInt(query.since, 10),
		session = channel.sessions[query.id],
		messageObj = channel.messages;

	if (!session) {
		return Response.jsons(400, { error: "No such session id." });
	}
	
	if (isNaN(since)) {
		return Response.jsons(400, { error: "Must supply since parameter." });
	}
	
	session.poke();
	
	if ( messageObj == null ) {
		return Response.jsons(400, { error: "Not Ready" });
	}
	return Response.json({messages:messageObj});
};

exports.send = {
	POST : function(request) {
		var channel = getChannel(),
			query = request.postParams,
			since = parseInt(query.since, 10),
			text = query.text,
			session = channel.sessions[query.id];

		if (!session) {
			return Response.jsons(400, { error: "No such session id." });
		}
		
		if (!text || !text.length) {
			return Response.jsons(400, { error: "Must supply text parameter." });
		}

		session.poke();
		var id = channel.appendMessage(session.nick, "msg", text);
		return Response.json({ id: id });
	}
};

exports.flush = function(request) {
	var channel = getChannel();
	channel.flushCallbacks();
	channel.expireOldSessions();
	taskqueue.add({url: "/chat/flush", method: "GET", eta : 2000});
	return Response.json({ message : "ok" });
};
