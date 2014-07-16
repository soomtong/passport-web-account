/**
 * Created by soomtong on 2014. 7. 2..
 */

var _ = require('lodash');
var passport = require('passport');

var Account = require('../model/account');
var Logging = require('../model/accountLog');

var Code = require('../model/code');


exports.createTwitterAccount = function(req, res) {
    var user = req.user;
    var result = Code.account.external.link;
    result.profile = user.profile;
    result.tokens = user.tokens;

    res.json(result);

    var log = new Logging({
        email: user.email,
        linkedAt: new Date()
    });

    log.save();

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
                result.profile = user.profile;
                result.tokens = user.tokens;

                res.send(result);

                var log = new Logging({
                    email: user.email,
                    signedIn: new Date()
                });

                log.save();
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

            var log = new Logging({
                email: user.email,
                unlinkedAt: new Date()
            });

            log.save();

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
            result.profile = user.profile;
            result.tokens = user.tokens;

            res.send(result);

            var log = new Logging({
                email: req.param('email'),
                signedIn: new Date()
            });

            log.save();
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

                var log = new Logging({
                    email: req.param('email'),
                    signedOut: new Date()
                });

                log.save();
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
            var localToken = { kind: 'local', accessToken: 'haroo-cloud' };

            user.tokens.push(localToken);

            user.save(function(err) {
                if (err) {
                    result = Code.account.create.database;

                    res.send(result);
                }

                result = Code.account.create.done;
                result.tokens = localToken;

                res.send(result);

                var log = new Logging({
                    email: req.param('email'),
                    createdAt: new Date()
                });

                log.save();
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

                        var log = new Logging({
                            email: req.param('email'),
                            updatedAt: new Date()
                        });

                        log.save();
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

                    var log = new Logging({
                        email: req.param('email'),
                        removedAt: new Date()
                    });

                    log.save();
                }
            });
        }
    })(req, res, callback);

};
