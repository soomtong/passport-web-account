var _ = require('lodash');
var passport = require('passport');
var uuid = require('node-uuid');

var Account = require('../model/account');
var Logging = require('../model/accountLog');
var AccountInit = require('../model/accountInit');

var Code = require('../model/code');
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
        result = Code.account.read.validation_for_ext;

        res.send(result);
        return callback(errors);
    }

    Account.findOne({ email: req.param('email') }, function(err, user) {
        if (user) {
            if (_.find(user.tokens, { kind: req.param('provider') })) {
                result = common.setAccountToClient(Code.account.read.done, user);

                res.send(result);

                common.saveSignInLog(user.email);
            } else {
                result = Code.account.read.no_exist;

                res.send(result);
            }
        } else {
            result = Code.account.read.no_exist;

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
            result = Code.account.read.no_exist;

            res.send(result);
        } else {
            Account.findOne({ haroo_id: user.haroo_id }, function (err, updateUser) {
                updateUser.access_token = common.getAccessToken();
                updateUser.login_expire = common.getLoginExpireDate();
                updateUser.save();

                result = common.setAccountToClient(Code.account.read.done, updateUser);

                res.send(result);
            });

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

    Logging.findOneAndUpdate({ email: req.param('email') }, { signed_out: new Date() }, { sort: { _id : -1 } },
        function (err, lastLog) {
            if (!lastLog) {
                result = Code.account.dismiss.no_exist;

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
    req.assert('confirm_password', 'Passwords do not match').equals(req.body.password);

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
        created_at: new Date(),
        profile: {
            name: req.param('nickname')
        }
    });

    Account.findOne({ email: req.param('email') }, function(err, existingUser) {
        if (existingUser) {
            result = Code.account.create.duplication;

            res.send(result);
        } else {
            user.haroo_id = common.getHarooID();
            user.access_token = common.getAccessToken();
            user.login_expire = common.getLoginExpireDate();

            AccountInit.initAccount(user.haroo_id);

            user.save(function(err) {
                if (err) {
                    result = Code.account.create.database;
                    result.info = err;

                    res.send(result);
                }

                result = common.setAccountToClient(Code.account.create.done, user);

                res.send(result);

                common.saveSignUpLog(req.param('email'));
            });
        }
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

exports.removeAccount = function (req, res, callback) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('access_token', 'Access Token can not Empty').notEmpty();

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
            result = Code.account.remove.no_exist;

            res.send(result);
        } else {
            var now = Date.now();
            if (user.access_token == req.param('access_token') && user.login_expire > now) {
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
            } else {
                result = Code.account.remove.token_expired;

                res.send(result);
            }
        }
    })(req, res, callback);

};

exports.access_token = function (req, res, callback) {
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

exports.forgotPassword = function (req, res, callback) {
    req.assert('email', 'Email is not valid').isEmail();

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.password.validation;

        res.send(result);
        return callback(errors);
    }

    Account.findOne({ email: req.param('email') }, function (err, existAccount) {
        if (!existAccount) {
            result = Code.account.password.no_exist;

            res.send(result);
        } else {
            var randomToken = uuid.v4();

            existAccount.reset_password_token = randomToken;
            existAccount.reset_password_token_expire = common.getPasswordResetExpire();
            existAccount.save();
            var host = req.protocol + '://' + req.host;

            common.sendPasswordResetMail(existAccount.email, { link: host + '/account/update-password/' + randomToken });

            result = Code.account.password.send_mail;

            res.send(result);
        }
    });
};

exports.haroo_id = function (req, res) {
    req.assert('haroo_id', 'haroo_id must be at least 4 characters long').len(4);
    req.assert('access_token', 'haroo_id have to need access token for retrieve').notEmpty();

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.haroo_id.validation;

        res.send(result);
        return;
    }

    Account.findOne({ haroo_id: req.param('haroo_id') }, function(err, existUser) {
        //  todo: should check access token
        if (existUser && (existUser.access_token == req.param('access_token'))) {
        result = Code.account.haroo_id.reserved;

            // expired?
            var now = Date.now();

            if (existUser.login_expire > now) {
                // login session
                req.logIn(existUser, function(err) {
                    if (err) {
                        result = Code.account.haroo_id.database;
                        result.info = err;

                        res.send(result);
                    } else {
                        common.saveAccountAccessLog('signed_in', req.param('email'));

                        result = common.setAccountToClient(Code.account.haroo_id.success, existUser);

                        res.send(result);
                    }
                });
            } else {
                result = Code.account.haroo_id.expired;

                res.send(result);
            }
        } else {
            result = Code.account.haroo_id.available;

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
        Account.findOne({ haroo_id: user.haroo_id }, function (err, updateUser) {
            updateUser.login_expire = common.getLoginExpireDate();
            updateUser.save();
        });

        req.logIn(user, function(err) {
            if (err) return callback(err);
            req.flash('success', { msg: 'Success! You are logged in.' });
            res.redirect(res.locals.site.url + '/api/loginDone');

            common.saveAccountAccessLog('signed_in', req.param('email'));

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
        Logging.findOneAndUpdate({ email: userEmail }, { signed_out: new Date() }, { sort: { _id : -1 } },
            function (err, lastLog) {
                if (!lastLog) {
                    common.saveAccountAccessLog('signed_out', userEmail);
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
    req.assert('confirm_password', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
        console.log(errors);
        req.flash('errors', errors);
        return res.redirect(res.locals.site.url + '/api/signup');
    }

    var user = new Account({
        haroo_id: common.getHarooID(),
        login_expire: common.getLoginExpireDate(),
        email: req.param('email'),
        password: req.param('password'),
        created_at: new Date(),
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
                    common.saveAccountAccessLog('created_at', req.param('email'));

                    return res.redirect(res.locals.site.url + '/api/loginDone');
                });
            });
        }
    });
};