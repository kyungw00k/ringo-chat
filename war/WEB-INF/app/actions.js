var {Response} = require('ringo/webapp/response');

exports.index = function (req) {
    return Response.skin(module.resolve('skins/indexIE.html'), {});
};
