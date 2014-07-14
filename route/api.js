/**
 * Created by soomtong on 2014. 7. 2..
 */

var _ = require('lodash');
var crypto = require('crypto');
var passport = require('passport');

var Account = require('../model/account');
var Logging = require('../model/accountLog');
var passportSecretsToken = require('../config/passport');

var Code = require('../model/code');

exports.readAccount = function (req, res, next) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password cannot be blank').notEmpty();

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.read.validation;

        res.send(result);
        return next(errors);
    }

    passport.authenticate('local', function(err, user, info) {
        if (err) {
            console.log(info);

            return next(err);
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
    })(req, res, next);
};

exports.dismissAccount = function (req, res, next) {
    req.assert('email', 'Email is not valid').isEmail();

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.dismiss.validation;

        res.send(result);
        return next(errors);
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

    Account.findOne({ email: req.body.email }, function(err, existingUser) {
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

exports.updateAccount = function (req, res, next) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);
    req.assert('nickname', 'Need a nickname').notEmpty();

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.update.validation;

        res.send(result);
        return next;
    }

    // todo: 나중에는 토큰으로 찾아야 할 것인가?
    passport.authenticate('local', function(err, user, info) {
        if (err) {
            console.log(info);

            return next(err);
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
    })(req, res, next);

};

exports.removeAccount = function (req, res, next) {
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

            return next(err);
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
    })(req, res, next);

};


exports.postLogin = function(req, res, next) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password cannot be blank').notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/login');
    }

    passport.authenticate('local', function(err, user, info) {
        if (err) return next(err);
        if (!user) {
            req.flash('errors', { msg: info.message });
            return res.redirect('/login');
        }
        req.logIn(user, function(err) {
            if (err) return next(err);
            req.flash('success', { msg: 'Success! You are logged in.' });
            res.redirect(req.session.returnTo || '/');
        });
    })(req, res, next);
};


exports.postSignup = function(req, res, next) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/signup');
    }

    var user = new Account({
        email: req.body.email,
        password: req.body.password
    });

    Account.findOne({ email: req.body.email }, function(err, existingUser) {
        if (existingUser) {
            req.flash('errors', { msg: 'Account with that email address already exists.' });
            return res.redirect('/signup');
        }
        user.save(function(err) {
            if (err) return next(err);
            req.logIn(user, function(err) {
                if (err) return next(err);
                res.redirect('/');
            });
        });
    });
};



/**
 * POST /account/profile
 * Update profile information.
 */

exports.postUpdateProfile = function(req, res, next) {
    Account.findById(req.user.id, function(err, user) {
        if (err) return next(err);
        user.email = req.body.email || '';
        user.profile.name = req.body.name || '';
        user.profile.gender = req.body.gender || '';
        user.profile.location = req.body.location || '';
        user.profile.website = req.body.website || '';

        user.save(function(err) {
            if (err) return next(err);
            req.flash('success', { msg: 'Profile information updated.' });
            res.redirect('/account');
        });
    });
};

/**
 * POST /account/password
 * Update current password.
 * @param password
 */

exports.postUpdatePassword = function(req, res, next) {
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/account');
    }

    Account.findById(req.user.id, function(err, user) {
        if (err) return next(err);

        user.password = req.body.password;

        user.save(function(err) {
            if (err) return next(err);
            req.flash('success', { msg: 'Password has been changed.' });
            res.redirect('/account');
        });
    });
};

/**
 * POST /account/delete
 * Delete user account.
 */

exports.postDeleteAccount = function(req, res, next) {
    Account.remove({ _id: req.user.id }, function(err) {
        if (err) return next(err);
        req.logout();
        req.flash('info', { msg: 'Your account has been deleted.' });
        res.redirect('/');
    });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 * @param provider
 */

exports.getOauthUnlink = function(req, res, next) {
    var provider = req.params.provider;
    Account.findById(req.user.id, function(err, user) {
        if (err) return next(err);

        user[provider] = undefined;
        user.tokens = _.reject(user.tokens, function(token) { return token.kind === provider; });

        user.save(function(err) {
            if (err) return next(err);
            req.flash('info', { msg: provider + ' account has been unlinked.' });
            res.redirect('/account');
        });
    });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */

exports.getReset = function(req, res) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    Account
        .findOne({ resetPasswordToken: req.params.token })
        .where('resetPasswordExpires').gt(Date.now())
        .exec(function(err, user) {
            if (!user) {
                req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
                return res.redirect('/forgot');
            }
            res.render('account/reset', {
                title: 'Password Reset'
            });
        });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 * @param token
 */

exports.postReset = function(req, res, next) {
    req.assert('password', 'Password must be at least 4 characters long.').len(4);
    req.assert('confirm', 'Passwords must match.').equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('back');
    }

    async.waterfall([
        function(done) {
            Account
                .findOne({ resetPasswordToken: req.params.token })
                .where('resetPasswordExpires').gt(Date.now())
                .exec(function(err, user) {
                    if (!user) {
                        req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
                        return res.redirect('back');
                    }

                    user.password = req.body.password;
                    user.resetPasswordToken = undefined;
                    user.resetPasswordExpires = undefined;

                    user.save(function(err) {
                        if (err) return next(err);
                        req.logIn(user, function(err) {
                            done(err, user);
                        });
                    });
                });
        },
        function(user, done) {
            var smtpTransport = nodemailer.createTransport('SMTP', {
                service: 'SendGrid',
                auth: {
                    user: passportSecretsToken.sendgrid.user,
                    pass: passportSecretsToken.sendgrid.password
                }
            });
            var mailOptions = {
                to: user.email,
                from: 'hackathon@starter.com',
                subject: 'Your Hackathon Starter password has been changed',
                text: 'Hello,\n\n' +
                    'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                req.flash('success', { msg: 'Success! Your password has been changed.' });
                done(err);
            });
        }
    ], function(err) {
        if (err) return next(err);
        res.redirect('/');
    });
};

/**
 * GET /forgot
 * Forgot Password page.
 */

exports.getForgot = function(req, res) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render('account/forgot', {
        title: 'Forgot Password'
    });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 * @param email
 */

exports.postForgot = function(req, res, next) {
    req.assert('email', 'Please enter a valid email address.').isEmail();

    var errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/forgot');
    }

    async.waterfall([
        function(done) {
            crypto.randomBytes(16, function(err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function(token, done) {
            Account.findOne({ email: req.body.email.toLowerCase() }, function(err, user) {
                if (!user) {
                    req.flash('errors', { msg: 'No account with that email address exists.' });
                    return res.redirect('/forgot');
                }

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

                user.save(function(err) {
                    done(err, token, user);
                });
            });
        },
        function(token, user, done) {
            var smtpTransport = nodemailer.createTransport('SMTP', {
                service: 'SendGrid',
                auth: {
                    user: passportSecretsToken.sendgrid.user,
                    pass: passportSecretsToken.sendgrid.password
                }
            });
            var mailOptions = {
                to: user.email,
                from: 'hackathon@starter.com',
                subject: 'Reset your password on Hackathon Starter',
                text: 'You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n' +
                    'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                    'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                    'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                req.flash('info', { msg: 'An e-mail has been sent to ' + user.email + ' with further instructions.' });
                done(err, 'done');
            });
        }
    ], function(err) {
        if (err) return next(err);
        res.redirect('/forgot');
    });
};