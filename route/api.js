var _ = require('lodash');
var passport = require('passport');

var Account = require('../model/account');
var Logging = require('../model/accountLog');

var Code = require('../model/code');
var commonVar = require('../config/common');
var common = require('./common');

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

    result.email = user.email;
    result.profile = user.profile;
    result.tokens = user.tokens;

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

    result.email = user.email;
    result.profile = user.profile;
    result.tokens = user.tokens;

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

    result.email = user.email;
    result.profile = user.profile;
    result.tokens = user.tokens;

    if (req.session['clientKey'] == 'external key') {
        result.clientKey = req.session['clientKey'];
        res.json(result);
    } else {
        res.redirect(req.session.returnTo || '/');
    }

    common.saveAccountLinkLog('google', user.email);

};


exports.accessAccount = function (req, res, callback) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('provider', 'Provider can not Empty').notEmpty();
    req.assert('accessToken', 'AccessToken can not Empty').notEmpty();

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.read.validationForExt;

        res.send(result);
        return callback(errors);
    }

    Account.findOne({ email: req.param('email') }, function(err, user) {
        if (user) {
            if (_.find(user.tokens, { kind: req.param('provider') })) {
                result = Code.account.read.done;

                result.harooID = user.harooID;
                result.email = user.email;
                result.profile = user.profile;
                result.tokens = user.tokens;

                res.send(result);

                common.saveSignInLog(user.email);
            } else {
                result = Code.account.read.noExist;

                res.send(result);
            }
        } else {
            result = Code.account.read.noExist;

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

exports.readAccount = function (req, res, callback) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password cannot be blank').notEmpty();

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.read.validation;

        res.send(result);
        return callback(errors);
    }

    passport.authenticate('local', function(err, user, info) {
        if (err) {
            console.log(info);

            return callback(err);
        }
        if (!user) {
            result = Code.account.read.noExist;

            res.send(result);
        } else {
            result = Code.account.read.done;

            result.harooID = user.harooID;
            result.email = user.email;
            result.profile = user.profile;
            result.tokens = user.tokens;

            res.send(result);

            common.saveSignInLog(req.param('email'));
        }
    })(req, res, callback);
};

exports.dismissAccount = function (req, res, callback) {
    req.assert('email', 'Email is not valid').isEmail();

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.dismiss.validation;

        res.send(result);
        return callback(errors);
    }

    Logging.findOneAndUpdate({ email: req.param('email') }, { signedOut: new Date() }, { sort: { _id : -1 } },
        function (err, lastLog) {
            if (!lastLog) {
                result = Code.account.dismiss.noExist;

                res.send(result);

                common.saveSignOutLog(req.param('email'));
            } else {
                result = Code.account.dismiss.done;

                res.send(result);
            }
        });
};

exports.createAccount = function (req, res) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.create.validation;

        res.send(result);
        return;
    }

    var user = new Account({
        email: req.param('email'),
        password: req.param('password'),
        createdAt: new Date(),
        profile: {
            name: req.param('nickname')
        }
    });

    Account.findOne({ email: req.param('email') }, function(err, existingUser) {
        if (existingUser) {
            result = Code.account.create.duplication;

            res.send(result);
        } else {
            user.harooID = common.getHarooID();
            user.save(function(err) {
                if (err) {
                    result = Code.account.create.database;

                    res.send(result);
                }

                result = Code.account.create.done;

                res.send(result);

                common.saveSignUpLog(req.param('email'));
            });
        }
    });
};

exports.updateAccount = function (req, res, callback) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);
    req.assert('nickname', 'Need a nickname').notEmpty();

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.update.validation;

        res.send(result);
        return callback;
    }

    // todo: 나중에는 토큰으로 찾아야 할 것인가?
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            console.log(info);

            return callback(err);
        }
        if (!user) {
            result = Code.account.update.noExist;

            res.send(result);
        } else {
            Account.findById(user._id, function (err, updateUser) {
                updateUser.updatedAt = new Date();
                updateUser.profile.name = req.param('nickname');

                updateUser.save(function (err, affectedUser) {
                    if (err) {
                        result = Code.account.update.database;

                        res.send(result);
                    } else {
                        result = Code.account.update.done;
                        result.tokens = affectedUser.tokens;

                        res.send(result);

                        common.saveAccountUpdateLog(req.param('email'))
                    }
                });

            });
        }
    })(req, res, callback);

};

exports.removeAccount = function (req, res, callback) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.remove.validation;

        res.send(result);
        return;
    }

    passport.authenticate('local', function(err, user, info) {
        if (err) {
            console.log(info);

            return callback(err);
        }
        if (!user) {
            result = Code.account.remove.noExist;

            res.send(result);
        } else {
            Account.remove({ _id: user._id }, function(err, countAffected) {
                if (err) {
                    result = Code.account.remove.database;

                    res.send(result);
                } else {
                    result = Code.account.remove.done;

                    res.send(result);

                    common.saveAccountRemoveLog(req.param('email'));
                }
            });
        }
    })(req, res, callback);

};


exports.harooID = function (req, res) {
    req.assert('harooID', 'harooID must be at least 4 characters long').len(4);

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.harooID.validation;

        res.send(result);
        return;
    }

    Account.findOne({ harooID: req.param('harooID') }, function(err, existingUser) {
        if (existingUser) {
            result = Code.account.harooID.reserved;

            // expired?
            var now = new Date();
            if (existingUser.loginExpire > now) {
                // login session
                req.logIn(existingUser, function(err) {
                    if (err) {
                        result = Code.account.harooID.database;
                        result.info = err;

                        res.send(result);
                    } else {
                        common.saveAccountAccessLog('signedIn', req.param('email'));

                        result = Code.account.harooID.success;
                        result.email = existingUser.email;
                        result.harooID = existingUser.harooID;
                        result.loginExpire = existingUser.loginExpire;
                        result.profile = existingUser.profile;

                        res.send(result);
                    }
                });
            } else {
                result = Code.account.harooID.expired;

                res.send(result);
            }
        } else {
            result = Code.account.harooID.available;

            res.send(result);
        }
    });
};

exports.loginForm = function (req, res) {
    var params = {};
    if (req.isAuthenticated()) return res.redirect(res.locals.site.url + '/api/loginDone');

    req.session.clientRoute = true;
    res.render('client/login', params);
};

exports.login = function(req, res, callback) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password cannot be blank').notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect(res.locals.site.url + '/api/login');
    }

    passport.authenticate('local', function(err, user, info) {
        if (err) return callback(err);
        if (!user) {
            req.flash('errors', { msg: info.message });
            return res.redirect(res.locals.site.url + '/api/login');
        }
        req.logIn(user, function(err) {
            if (err) return callback(err);
            req.flash('success', { msg: 'Success! You are logged in.' });
            res.redirect(res.locals.site.url + '/api/loginDone');

            common.saveAccountAccessLog('signedIn', req.param('email'));

        });
    })(req, res, callback);
};

exports.loginDone = function (req, res) {
    var params = {};

    req.session.clientRoute = null;

    res.render('client/loginDone', params);
};

exports.logout = function(req, res) {
    if (req.isAuthenticated()) {
        var userEmail = req.user['email'];
        Logging.findOneAndUpdate({ email: userEmail }, { signedOut: new Date() }, { sort: { _id : -1 } },
            function (err, lastLog) {
                if (!lastLog) {
                    common.saveAccountAccessLog('signedOut', userEmail);
                }
            });
    }

    req.logout();
    res.redirect(res.locals.site.url + '/api/login');
};

exports.signUpForm = function (req, res) {
    var params = {};
    if (req.isAuthenticated()) return res.redirect(res.locals.site.url + '/api/loginDone');
    res.render('client/signup', params);
};

exports.signUp = function (req, res) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
        console.log(errors);
        req.flash('errors', errors);
        return res.redirect(res.locals.site.url + '/api/signup');
    }

    var user = new Account({
        harooID: common.getHarooID(),
        loginExpire: common.getLoginExpireDate(),
        email: req.param('email'),
        password: req.param('password'),
        createdAt: new Date(),
        profile: {
            name: req.param('nickname')
        }
    });

    Account.findOne({ email: req.param('email') }, function(err, existingUser) {
        if (existingUser) {
            console.log('Account with that email address already exists.');
            req.flash('errors', { msg: 'Account with that email address already exists.' });

            return res.redirect(res.locals.site.url + '/api/signup');
        } else {
            user.save(function(err) {
                if (err) {
                    console.log(err);
                    return res.redirect(res.locals.site.url + '/api/signup');
                }
                req.logIn(user, function (err) {
                    if (err) {
                        console.log(err);
                    }
                    common.saveAccountAccessLog('createdAt', req.param('email'));

                    return res.redirect(res.locals.site.url + '/api/loginDone');
                });
            });
        }
    });
};