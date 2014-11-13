var _ = require('lodash');
var passport = require('passport');
var uuid = require('node-uuid');

var Account = require('../model/account');
var Logging = require('../model/accountLog');
var AccountInit = require('../model/accountInit');

var Code = require('../model/code');
var common = require('./common');


// signup
exports.createAccount = function (req, res) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);

    var result = {};
    var errors = req.validationErrors();

    if (errors) {
        result = Code.account.create.validation;
        result.validation = errors;

        res.send(result);
        return;
    }

    var user = new Account({
        email: req.param('email'),
        password: req.param('password'),
        created_at: new Date(),
        profile: {
            name: req.param('nickname')
        }
    });

    Account.findOne({ email: req.param('email') }, function(err, existUser) {
        if (err) {
            result = Code.account.create.database;
            result.passport = err;
            res.send(result);

            return;
        }
        if (existUser) {
            result = Code.account.create.duplication;

            res.send(result);
        } else {
            user.haroo_id = AccountInit.initHarooID(req.param('email'));
            user.access_token = common.getAccessToken();
            user.login_expire = common.getLoginExpireDate();

            AccountInit.initAccount(user.haroo_id);

            user.save(function(err) {
                if (err) {
                    result = Code.account.create.database;
                    result.db_info = err;
                    res.send(result);

                    return;
                }

                common.saveSignUpLog(req.param('email'));

                result = common.setAccountToClient(Code.account.create.done, user);

                res.send(result);
            });
        }
    });
};

// login
exports.readAccount = function (req, res, callback) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password cannot be blank').notEmpty();

    var result = {};
    var errors = req.validationErrors();

    if (errors) {
        result = Code.account.login.validation;
        result.validation = errors;

        res.send(result);
        return;
    }

    passport.authenticate('local', function(err, loginUser, info) {
        if (err) {
            result = Code.account.login.database;
            result.passport = err;
            res.send(result);

            return callback();
        }
        if (loginUser && loginUser._id) {
            Account.findById(loginUser._id, function (err, updateUser) {
                // login and save access token
                updateUser.access_token = common.getAccessToken();
                updateUser.login_expire = common.getLoginExpireDate();
                updateUser.save(function (err) {
                    if (err) {
                        result = Code.account.login.database;
                        result.db_info = err;
                        res.send(result);

                        return;
                    }
                    common.saveSignInLog(req.param('email'));

                    result = common.setAccountToClient(Code.account.login.done, updateUser);

                    res.send(result);
                });
            });
        } else {
            result = Code.account.login.no_exist;

            res.send(result);
        }
    })(req, res, callback);
};

// forget password mailing
exports.forgotPassword = function (req, res) {
    req.assert('email', 'Email is not valid').isEmail();

    var result = {};
    var errors = req.validationErrors();

    if (errors) {
        result = Code.account.password.validation;
        result.validation = errors;

        res.send(result);
        return;
    }

    Account.findOne({ email: req.param('email') }, function (err, existAccount) {
        if (err) {
            result = Code.account.password.database;
            result.passport = err;
            res.send(result);

            return;
        }

        if (existAccount && existAccount.email) {
            var randomToken = uuid.v4();

            existAccount.reset_password_token = randomToken;
            existAccount.reset_password_token_expire = common.getPasswordResetExpire();
            existAccount.save();
            var host = req.protocol + '://' + req.host;

            common.sendPasswordResetMail(existAccount.email, {link: host + '/account/update-password/' + randomToken});

            result = Code.account.password.send_mail;

            res.send(result);
        } else {
            result = Code.account.password.no_exist;

            res.send(result);
        }
    });
};

// token check
exports.validateToken = function (req, res) {
    var accessToken = res.locals.token;

    var result = {};

    if (!accessToken) {
        result = Code.account.token.validation;

        res.send(result);
        return;
    }

    Account.findOne({access_token: accessToken}, function (err, existUser) {
        if (err) {
            result = Code.account.token.no_exist;
            result.passport = err;
            res.send(result);

            return;
        }

        if (existUser) {
            // expired?
            var now = Date.now();

            if (existUser.login_expire > now) {
                common.saveAccountAccessLog('check_token', existUser.email);

                result = common.setAccountToClient(Code.account.token.allowed, existUser);

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

// get user info
exports.accountInfo = function (req, res) {
    req.assert('haroo_id', 'haroo_id must be at least 4 characters long').len(4);

    var result = {};
    var errors = req.validationErrors();

    if (errors) {
        result = Code.account.haroo_id.validation;
        result.validation = errors;

        res.send(result);
        return;
    }

    Account.findOne({haroo_id: req.param('haroo_id')}, function (err, existUser) {
        if (err) {
            result = Code.account.haroo_id.database;
            result.passport = err;
            res.send(result);

            return;
        }

        var accessToken = res.locals.token;

        if (existUser && (existUser.access_token == accessToken)) {
            // expired?
            var now = Date.now();

            if (existUser.login_expire > now) {
                common.saveAccountAccessLog('signed_in', req.param('email'));

                result = common.setAccountToClient(Code.account.haroo_id.success, existUser);

                res.send(result);
            } else {
                result = Code.account.haroo_id.expired;

                res.send(result);
            }
        } else {
            result = Code.account.haroo_id.invalid;

            res.send(result);
        }
    });
};

// update user password
exports.updatePassword = function (req, res) {
    req.assert('haroo_id', 'Haroo ID is not valid').notEmpty();
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);

    var result = {};
    var errors = req.validationErrors();

    if (errors) {
        result = Code.account.update.validation;
        result.validation = errors;

        res.send(result);
        return;
    }

    Account.findOne({haroo_id: req.param('haroo_id'), email: req.param('email')}, function(err, updateUser) {
        if (err) {
            result = Code.account.haroo_id.database;
            result.db_info = err;
            res.send(result);

            return;
        }

        var accessToken = res.locals.token;

        if (updateUser && (updateUser.access_token == accessToken)) {
            result = Code.account.update.done;

            var now = Date.now();

            if (updateUser.login_expire > now) {
                updateUser.password = req.param('password');
                updateUser.access_token = common.getAccessToken();
                updateUser.login_expire = common.getLoginExpireDate();

                updateUser.save(function(err) {
                    if (err) {
                        result = Code.account.update.database;
                        result.db_info = err;
                        res.send(result);

                        return;
                    }

                    // good
                    common.saveAccountAccessLog('change_password', req.param('email'));

                    result = common.setAccountToClient(Code.account.update.done, updateUser);

                    res.send(result);
                });
            } else {
                result = Code.account.haroo_id.expired;

                res.send(result);
            }
        } else {
            result = Code.account.haroo_id.invalid;

            res.send(result);
        }
    });
};

// update user info
exports.updateAccountInfo = function (req, res) {
    req.assert('email', 'Email is not valid').isEmail();

    var result = {};
    var errors = req.validationErrors();

    if (errors) {
        result = Code.account.update.validation;
        result.validation = errors;

        res.send(result);
        return callback;
    }

    Account.findOne({ email: req.param('email') }, function(err, existUserForUpdate) {
        if (err) {
            result = Code.account.haroo_id.database;
            result.passport = err;
            res.send(result);

            return;
        }

        var accessToken = res.locals.token;

        if (existUserForUpdate && (existUserForUpdate.access_token == accessToken)) {
            result = Code.account.update.done;

            var now = Date.now();

            if (existUserForUpdate.login_expire > now) {
                existUserForUpdate.profile.name = req.param('nickname');
                existUserForUpdate.updated_at = new Date();
                existUserForUpdate.access_token = common.getAccessToken();
                existUserForUpdate.login_expire = common.getLoginExpireDate();

                existUserForUpdate.save(function (err, affectedUser) {
                    if (err) {
                        result = Code.account.update.database;
                        result.db_info = err;
                        res.send(result);

                        return;
                    }

                    // good
                    common.saveAccountUpdateLog(req.param('email'));

                    result = common.setAccountToClient(Code.account.create.done, affectedUser);

                    res.send(result);
                });
            } else {
                result = Code.account.haroo_id.expired;

                res.send(result);
            }
        } else {
            result = Code.account.update.no_exist;

            res.send(result);
        }
    });
};

exports.dismissAccount = function (req, res) {
    req.assert('email', 'Email is not valid').isEmail();

    var result = {};
    var errors = req.validationErrors();

    if (errors) {
        result = Code.account.dismiss.validation;
        result.validation = errors;

        res.send(result);
        return;
    }

    Account.findOne({haroo_id: req.param('haroo_id'), email: req.param('email')}, function (err, logoutUser) {
        if (err) {
            result = Code.account.dismiss.database;
            result.db_info = err;
            res.send(result);

            return;
        }

        var accessToken = res.locals.token;

        if (logoutUser && logoutUser.access_token == accessToken) {
            result = Code.account.dismiss.done;

            var now = Date.now();

            if (logoutUser.login_expire > now) {
                logoutUser.access_token = undefined;
                logoutUser.login_expire = undefined;

                logoutUser.save(function (err) {
                    if (err) {
                        result = Code.account.dismiss.database;
                        result.db_info = err;
                        res.send(result);

                        return;
                    }

                    // good
                    common.saveSignOutLog(req.param('email'));

                    result = Code.account.dismiss.done;

                    res.send(result);
                });
            } else {
                result = Code.account.haroo_id.expired;

                res.send(result);
            }
        } else {
            result = Code.account.haroo_id.invalid;

            res.send(result);
        }
    });
};

exports.removeAccount = function (req, res, callback) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);

    var result = {};
    var errors = req.validationErrors();

    if (errors) {
        result = Code.account.remove.validation;
        result.validation = errors;

        res.send(result);
        return;
    }

    passport.authenticate('local', function(err, validUser, info) {
        if (err) {
            result = Code.account.remove.database;
            result.db_info = err;
            res.send(result);

            return callback();
        }

        var accessToken = res.locals.token;

        if (validUser && validUser.access_token == accessToken) {
            // expired?
            var now = Date.now();

            if (validUser.login_expire > now) {
                Account.remove({_id: validUser._id}, function (err, countAffected) {
                    if (err) {
                        result = Code.account.remove.database;

                        res.send(result);
                    } else {
                        common.saveAccountRemoveLog(req.param('email'));

                        result = Code.account.remove.done;

                        res.send(result);
                    }
                });
            } else {
                result = Code.account.haroo_id.token_expired;

                res.send(result);
            }
        } else {
            result = Code.account.haroo_id.invalid;

            res.send(result);
        }
    })(req, res, callback);
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

            common.saveAccountLinkLog(provider, user.email);

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

    common.saveAccountLinkLog('twitter', user.email);

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

    common.saveAccountLinkLog('facebook', user.email);

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

    common.saveAccountLinkLog('google', user.email);

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
                result = common.setAccountToClient(Code.account.login.done, user);

                res.send(result);

                common.saveSignInLog(user.email);
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

            common.saveUnlinkLog(user.email);

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
                updateUser.access_token = common.getAccessToken();
                updateUser.login_expire = common.getLoginExpireDate();

                updateUser.save(function (err, affectedUser) {
                    if (err) {
                        result = Code.account.update.database;

                        res.send(result);
                    } else {
                        result = common.setAccountToClient(Code.account.create.done, affectedUser);

                        res.send(result);

                        common.saveAccountUpdateLog(req.param('email'))
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
                common.saveAccountAccessLog('signed_in', req.param('email'));

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
