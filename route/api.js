var _ = require('lodash');
var Pipe = require('pipe');

var database = require('../config/database');

var Account = Pipe.Account;

var Code = Pipe.HarooCode;
var Common = Pipe.CommonUtil;


// signup
exports.createAccount = function (req, res) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);

    var params = {
        email: req.param('email'),
        password: req.param('password'),
        nickname: req.param('nickname'),
        database: database,
        result: {}
    };

    var errors = req.validationErrors();

    if (errors) {
        params.result = Code.account.create.validation;
        params.result.validation = errors;

        res.send(params.result);
        return;
    }

    Account.createByEmail(params, function (result) {
        res.send(result);
    });
};

// login
exports.readAccount = function (req, res, callback) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password cannot be blank').notEmpty();

    var params = {
        email: req.param('email'),
        password: req.param('password'),
        req: req,
        res: res,
        result: {}
    };

    var errors = req.validationErrors();

    if (errors) {
        params.result = Code.account.login.validation;
        params.result.validation = errors;

        res.send(params.result);
        return;
    }

    Account.loginByPassport(params, function (result) {
        res.send(result);
    });
};

// forget password mailing
exports.forgotPassword = function (req, res) {
    req.assert('email', 'Email is not valid').isEmail();

    var params = {
        email: req.param('email'),
        protocol: req.protocol,
        hostname: req.hostname,
        result: {}
    };

    var errors = req.validationErrors();

    if (errors) {
        params.result = Code.account.password.validation;
        params.result.validation = errors;

        res.send(params.result);
        return;
    }

    Account.passwordResetByEmail(params, function (result) {
        res.send(result);
    });
};

// token check
exports.validateToken = function (req, res) {
    var params = {
        expireToken: !!req.param('keep'),
        accessToken: res.locals.token,
        result: {}
    };

    if (!params.accessToken) {
        params.result = Code.account.token.validation;

        res.send(params.result);
        return;
    }
    if (params.expireToken) {
        Account.findByToken(params, function (result) {
            res.send(result);
        });
    } else {
        // expire access token
        Account.findByTokenWithExpire(params, function (result) {
            res.send(result);
        });
    }
};

// get user info
exports.accountInfo = function (req, res) {
    req.assert('haroo_id', 'haroo_id is not valid').notEmpty();

    var params = {
        haroo_id: req.param('haroo_id'),
        accessToken: res.locals.token,
        result: {}
    };

    var errors = req.validationErrors();

    if (errors) {
        params.result = Code.account.haroo_id.validation;
        params.result.validation = errors;

        res.send(params.result);
        return;
    }

    Account.findByHarooID(params, function (result) {
        res.send(result);
    });
};

// update user password
exports.updatePassword = function (req, res) {
    req.assert('haroo_id', 'Haroo ID is not valid').notEmpty();
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);

    var params = {
        haroo_id: req.param('haroo_id'),
        email: req.param('email'),
        password: req.param('password'),
        accessToken: res.locals.token,
        result: {}
    };

    var errors = req.validationErrors();

    if (errors) {
        params.result = Code.account.update.validation;
        params.result.validation = errors;

        res.send(params.result);
        return;
    }

    Account.updatePasswordByEmail(params, function (result) {
        res.send(result);
    });
};

// update user info
exports.updateAccountInfo = function (req, res) {
    req.assert('haroo_id', 'Haroo ID is not valid').notEmpty();
    req.assert('email', 'Email is not valid').isEmail();

    var params = {
        haroo_id: req.param('haroo_id'),
        email: req.param('email'),
        nickname: req.param('nickname'),
        accessToken: res.locals.token,
        result: {}
    };

    var errors = req.validationErrors();

    if (errors) {
        params.result = Code.account.update.validation;
        params.result.validation = errors;

        res.send(params.result);
        return;
    }

    Account.updateInfoByEmail(params, function (result) {
        res.send(result);
    });
};

exports.dismissAccount = function (req, res) {
    req.assert('haroo_id', 'Haroo ID is not valid').notEmpty();
    req.assert('email', 'Email is not valid').isEmail();

    var params = {
        haroo_id: req.param('haroo_id'),
        email: req.param('email'),
        accessToken: res.locals.token,
        result: {}
    };

    var errors = req.validationErrors();

    if (errors) {
        params.result = Code.account.dismiss.validation;
        params.result.validation = errors;

        res.send(params.result);
        return;
    }

    Account.logoutByEmail(params, function (result) {
        res.send(result);
    });
};

exports.removeAccount = function (req, res, callback) {
    req.assert('haroo_id', 'Haroo ID is not valid').notEmpty();
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);

    var params = {
        haroo_id: req.param('haroo_id'),
        email: req.param('email'),
        password: req.param('password'),
        accessToken: res.locals.token,
        req: req,
        res: res,
        result: {}
    };

    var errors = req.validationErrors();

    if (errors) {
        params.result = Code.account.remove.validation;
        params.result.validation = errors;

        res.send(params.result);
        return;
    }

    Account.deleteByPassport(params, function (result) {
        res.send(result);
    });
};


// block unknown
exports.accessTokenMiddleware = function (req, res, next) {
    var token = res.locals.token = req.header('x-access-token');
    if (!token) return res.send(Code.token.blocked);

    next();
};




exports.linkExternalAccount = function (req, res, next) {
    var provider = req.path.split('/')[2];

    var redirect = {
        success: req.session.clientRoute? '/api/loginDone' : '/',
        fail: req.session.clientRoute ? '/api/login' : '/login'
    };

    passport.authenticate(provider, function (err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.redirect(redirect.fail);
        }
        req.logIn(user, function (err) {
            if (err) {
                return next(err);
            }

            Common.saveAccountLinkLog(provider, user.email);

            // clear client session
            req.session.clientRoute = null;
            return res.redirect(redirect.success);
        });
    })(req, res, next);

};

exports.createTwitterAccount = function(req, res) {
    var user = req.user;
    var result = Code.account.external.link;

    result.email = user['email'];
    result.profile = user['profile'];
    result.tokens = user['tokens'];

    if (req.session['clientKey'] == 'external key') {
        result.clientKey = req.session['clientKey'];
        res.json(result);
    } else {
        res.redirect(req.session.returnTo || '/');
    }

    Common.saveAccountLinkLog('twitter', user.email);

};

exports.createFacebookAccount = function(req, res) {
    var user = req.user;
    var result = Code.account.external.link;

    result.email = user['email'];
    result.profile = user['profile'];
    result.tokens = user['tokens'];

    if (req.session['clientKey'] == 'external key') {
        result.clientKey = req.session['clientKey'];
        res.json(result);
    } else {
        res.redirect(req.session.returnTo || '/');
    }

    Common.saveAccountLinkLog('facebook', user.email);

};

exports.createGoogleAccount = function(req, res) {
    var user = req.user;
    var result = Code.account.external.link;

    result.email = user['email'];
    result.profile = user['profile'];
    result.tokens = user['tokens'];

    if (req.session['clientKey'] == 'external key') {
        result.clientKey = req.session['clientKey'];
        res.json(result);
    } else {
        res.redirect(req.session.returnTo || '/');
    }

    Common.saveAccountLinkLog('google', user.email);

};

exports.checkLinkAuth = function (req, res, callback) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('provider', 'Provider can not Empty').notEmpty();
    req.assert('access_token', 'AccessToken can not Empty').notEmpty();

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.login.validation_for_ext;

        res.send(result);
        return callback(errors);
    }

    Account.findOne({ email: req.param('email') }, function(err, user) {
        if (user) {
            if (_.find(user.tokens, { kind: req.param('provider') })) {
                result = Common.setAccountToClient(Code.account.login.done, user);

                res.send(result);

                Common.saveSignInLog(user.email);
            } else {
                result = Code.account.login.no_exist;

                res.send(result);
            }
        } else {
            result = Code.account.login.no_exist;

            res.send(result);
        }
    });
};

exports.linkAuth = function (req, res, callback) {
    req.assert('provider', 'Provider can not Empty').notEmpty();
    req.assert('clientKey', 'clientKey can not Empty').notEmpty();

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.external.validation;

        res.send(result);
        return callback(errors);
    }

    var uri = "/auth/" + req.param('provider');

    res.redirect(uri);
};

exports.unlinkAuth = function(req, res, callback) {
    req.assert('provider', 'Auth type can not be blank').notEmpty();
    req.assert('email', 'Email is not valid').isEmail();

    var provider = req.param('provider');
    Account.findOne({ email: req.param('email') }, function(err, user) {
        if (err) return callback(err);

        user[provider] = undefined;
        user.tokens = _.reject(user.tokens, function(token) { return token.kind === provider; });

        user.save(function(err) {
            if (err) return callback(err);

            var result = Code.account.external.unlink;

            res.json(result);

            Common.saveUnlinkLog(user.email);

        });
    });
};


exports.updateAccount = function (req, res, callback) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('access_token', 'Access Token can not Empty').notEmpty();
    //req.assert('nickname', 'Need a nickname').notEmpty();

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.update.validation;

        res.send(result);
        return callback;
    }

    passport.authenticate('local', function(err, user, info) {
        if (err) {
            console.log(info);

            return callback(err);
        }
        if (!user) {
            result = Code.account.update.no_exist;

            res.send(result);
        } else {
            // todo: check token and expire
            Account.findById(user._id, function (err, updateUser) {
                updateUser.updated_at = new Date();
                updateUser.profile.name = req.param('nickname');
                updateUser.access_token = Common.getAccessToken();
                updateUser.login_expire = Common.getLoginExpireDate();

                updateUser.save(function (err, affectedUser) {
                    if (err) {
                        result = Code.account.update.database;

                        res.send(result);
                    } else {
                        result = Common.setAccountToClient(Code.account.create.done, affectedUser);

                        res.send(result);

                        Common.saveAccountUpdateLog(req.param('email'))
                    }
                });

            });
        }
    })(req, res, callback);

};

exports.readAccessToken = function (req, res, callback) {
    req.assert('access_token', 'AccessToken can not Empty').notEmpty();

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.token.validation;

        res.send(result);
        return callback(errors);
    }

    Account.findOne({ accessToken: req.param('access_token') }, function(err, existUser) {
        if (existUser) {
            // expired?
            var now = Date.now();

            if (existUser.login_expire > now) {
                Common.saveAccountAccessLog('signed_in', req.param('email'));

                result = Code.account.token.allowed;

                res.send(result);
            } else {
                result = Code.account.token.denied;

                res.send(result);
            }
        } else {
            result = Code.account.token.no_exist;

            res.send(result);
        }
    });
};
