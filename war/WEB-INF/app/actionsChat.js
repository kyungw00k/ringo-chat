var {Response} = require('ringo/webapp/response'),
	Channel = require('./channel').Channel,
	sys = require('system'),
	chat = require('./server'),
	Session = require('./session'),
	taskqueue = require('google/appengine/api/taskqueue'),
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

var chatServer = chat.createServer(),
	channelSingleton = chatServer.addChannel({basePath: "/chat"});

/*
 * Set Channel Listener
 */
channelSingleton.addListener("msg", function(msg) {
	sys.print("<" + msg.nick + "> " + msg.text);
}).addListener("join", function(msg) {
	sys.print("<" + msg.nick + "> join");
}).addListener("part", function(msg) {
	sys.print("<" + msg.nick + "> part");
});

/*
 * Routing
 */
exports.who = function(request) {
	var nicks = [],
		channel = channelSingleton.fetchFromMemcache();
	for (var id in channel.sessions) {
		nicks.push(channel.sessions[id].nick);
	}
	return Response.json({ nicks: nicks });
};

exports.part = function(request) {
	var id = request.queryParams.id;
	var eventId = channelSingleton.fetchFromMemcache().destroySession(id);
	return Response.json({ id: eventId });
};

exports.join = {
	POST : function(request) {
		var nick = request.postParams.nick;

		if (!nick) {
			return Response.jsons(400, { error: "bad nick." });
		}
		
		var session = channelSingleton.fetchFromMemcache().createSession(nick);
		if (!session) {
			return Response.jsons(400, { error: "nick in use." });
		}
		
		var message = { id: session.id, nick: nick, since: session.since, channel_id : session.token};
		return Response.json(message);
	}
};

exports.recv = function(request) {
	var channel = channelSingleton.fetchFromMemcache(),
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
		var channel = channelSingleton.fetchFromMemcache(),
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

exports.flush = {
	POST : function(request) {
		var channel = channelSingleton.fetchFromMemcache();
		channel.expireOldSessions();
		return Response.json({ message : "ok" });
	}		
};
exports.reset = function(request) {
	var channel = channelSingleton.fetchFromMemcache();
	channel.reset();
	return Response.redirect('/');
};