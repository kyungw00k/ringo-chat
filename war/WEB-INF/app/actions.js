var {Response} = require('ringo/webapp/response');

var memcache = require("google/appengine/api/memcache"),
    taskqueue = require('google/appengine/api/taskqueue');

exports.index = function (req) {
	var queue_payload = memcache.get('queue_payload');
	if ( queue_payload == 0) {
		taskqueue.add({url:"/chat/task", method:"POST", countdown : 1});
		memcache.set('queue_payload', 1);
	}
	return Response.skin(module.resolve('skins/index.html'), {});
};
