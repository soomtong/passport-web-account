var apiCallCounterForIPs = [];
var apiCallCounterForToken = [];


exports.callCounterForIPs = function (req, res, next) {
    var ip = req['ip'];

    if (ip) {
        var now = Date.now();
        if (apiCallCounterForIPs[ip] && apiCallCounterForIPs[ip].count) {
            apiCallCounterForIPs[ip].count++;
            apiCallCounterForIPs[ip].updateAt = now;
        } else {
            apiCallCounterForIPs[ip] = {
                count: 1,
                updateAt: now
            }
        }
        //console.log(apiCallCounterForIPs);
    }
    next();
};

exports.callCounterForToken = function (req, res, next) {
    var token = req.header('x-access-token');

    if (token) {
        var now = Date.now();
        if (apiCallCounterForToken[token] && apiCallCounterForToken[token].count) {
            apiCallCounterForToken[token].count++;
            apiCallCounterForToken[token].updateAt = now;
        } else {
            apiCallCounterForToken[token] = {
                count: 1,
                updateAt: now
            }
        }
        //console.log(apiCallCounterForToken);
    }
    next();
};


// block unknown
exports.accessToken = function (req, res, next) {
    var token = res.locals.accessToken = req.header('x-access-token');
    if (!token) return res.send(Code.token.blocked);

    next();
};

// tracking host name
exports.accessHost = function (req, res, next) {
    var host = res.locals.accessHost = req.header('x-access-host');

    next();
};
