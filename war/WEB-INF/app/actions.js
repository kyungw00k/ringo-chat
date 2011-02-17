var {Response} = require('ringo/webapp/response');

var memcache = require("google/appengine/api/memcache"),
    taskqueue = require('google/appengine/api/taskqueue');

exports.index = function (req) {
	var queue_payload = memcache.get('queue_payload');
	if ( !queue_payload ) {
		taskqueue.add({url:"/chat/task", method:"POST", eta : ((new Date()).getTime()+1500) });
		memcache.set('queue_payload', 1);
	}
	return Response.skin(module.resolve('skins/index.html'), {});
};
