var _ = require('lodash');
var passport = require('passport');
var nodemailer = require('nodemailer');
var uuid = require('node-uuid');
var emailToken = require('../config/mailer')['email-token'];
var emailTemplates = require('swig-email-templates');
var Account = require('../model/account');
var Logging = require('../model/accountLog');

var Code = require('../model/code');

var common = require('./common');


function sendPasswordResetMail(address, context) {
    var smtpTransport = nodemailer.createTransport(emailToken);

    emailTemplates({ root: __dirname + "/templates" }, function (error, render) {
        var email = {
            from: emailToken['reply'], // sender address
            to: address,
//            bcc: emailToken.bcc,
            subject: "Reset your password link described"
        };

        render('password_reset_email.html', context, function (error, html) {
            console.log(html);
            email.html = html;
            smtpTransport.sendMail(email, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log("Message sent: " + info.response);
                }

                // if you don't want to use this transport object anymore, uncomment following line
                smtpTransport.close(); // shut down the connection pool, no more messages
            });
        });
    });
}


// Login Required middleware.
exports.isAuthenticated = function(req, res, callback) {
    if (req.isAuthenticated()) return callback();
    res.redirect('/login');
};

// Authorization Required middleware.
exports.isAuthorized = function(req, res, callback) {
    var provider = req.path.split('/').slice(-1)[0];

    if (_.find(req.user.tokens, { kind: provider })) {
        callback();
    } else {
        res.redirect('/auth/' + provider);
    }
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
    res.redirect('/');
};

exports.loginForm = function (req, res) {
    var params = {};
    if (req.isAuthenticated()) return res.redirect('/account');
    res.render('login', params);
};

exports.login = function(req, res, callback) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password cannot be blank').notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/login');
    }

    passport.authenticate('local', function(err, user, info) {
        if (err) return callback(err);
        if (!user) {
            req.flash('errors', { msg: info.message });
            return res.redirect('/login');
        }
        req.logIn(user, function(err) {
            if (err) return callback(err);
            req.flash('success', { msg: 'Success! You are logged in.' });
            res.redirect(req.session.returnTo || '/');

            common.saveAccountAccessLog('signedIn', req.param('email'));
        });
    })(req, res, callback);
};

exports.signUpForm = function (req, res) {
    var params = {};
    if (req.isAuthenticated()) return res.redirect('/');
    res.render('signup', params);
};

exports.signUp = function (req, res, next) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.body.password);

    var errors = req.validationErrors();

    if (errors) {
        console.log(errors);
        req.flash('errors', errors);
        return res.redirect('signup');
    }

    var user = new Account({
        harooID: common.getHarooID(),
        loginExpire: common.getLoginExpireDate(),
        email: req.param('email'),
        password: req.param('password'),
        createdAt: new Date(),
        fromWeb: 'public homepage',
        profile: {
            name: req.param('nickname')
        }
    });

    Account.findOne({ email: req.param('email') }, function(err, existingUser) {
        if (existingUser) {
            console.log('Account with that email address already exists.');
            req.flash('errors', { msg: 'Account with that email address already exists.' });

            return res.redirect('/signup');
        } else {
            user.save(function(err) {
                if (err) {
                    console.log(err);
                    return next(err);
                }
                req.logIn(user, function (err) {
                    if (err) {
                        console.log(err);
                        return next(err);
                    }
                    common.saveAccountAccessLog('createdAt', req.param('email'));

                    res.redirect('/');
                });
            });
        }
    });
};

exports.accountInfo = function (req, res) {
    var params = {
        user: req.user||''
    };

    res.render('profile', params)
};

exports.udpateProfile = function (req, res) {
    //req.assert('harooID', 'harooID must be at least 4 characters long').len(4);

    var errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/account');
    }

    Account.findById(req.user.id, function(err, user) {
        if (err) return next(err);

        //user.harooID = req.param('harooID');  // deprecated
        // model for update, something like
        //user.profile = req.body;

        user.save(function(err) {
            if (err) {
                req.flash('errors', { msg: 'Database update error' });
                return res.redirect('/account');
            }
            req.flash('success', { msg: 'Profile has been changed.' });
            res.redirect('/account');
        });
    });
};

exports.updatePassword = function (req, res, next) {
    req.assert('password', 'Password must be at least 4 characters long').len(4);
    req.assert('confirmPassword', 'Passwords do not match').equals(req.param('password'));

    var errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/account');
    }

    Account.findById(req.user.id, function(err, user) {
        if (err) return next(err);

        user.password = req.param('password');

        user.save(function(err) {
            if (err) return next(err);
            req.flash('success', { msg: 'Password has been changed.' });
            res.redirect('/account');
        });
    });
};

exports.deleteAccount = function(req, res, next) {
    req.assert('confirmDelete', 'Need confirm check for delete your account').equals('sure');

    var errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/account');
    }

    Account.remove({ _id: req.user.id }, function(err) {
        if (err) return next(err);
        req.logout();
        req.flash('info', { msg: 'Your account has been deleted.' });
        res.redirect('/');
    });
};

exports.unlinkAccount = function(req, res, next) {
    var provider = req.param('provider');
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

exports.resetPasswordForm = function (req, res) {
    var params = {};
    if (req.isAuthenticated()) return res.redirect('/');
    res.render('reset-password', params);
};

exports.resetPassword = function (req, res) {
    if (req.isAuthenticated()) return res.redirect('/');

    req.assert('email', 'Email is not valid').isEmail();

    var errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/account/reset-password');
    }

    var params = {
        email: req.param('email'),
        sent: true
    };

    Account.findOne({ email: req.param('email') }, function (err, existAccount) {
        if (!existAccount) {
            req.flash('info', { msg: 'Email is not valid' });
            return res.redirect('/account/reset-password');
        }

        var randomToken = uuid.v4();

        existAccount.resetPasswordToken = randomToken;
        existAccount.resetPasswordTokenExpires = Date.now() + DAY; // 1 day
        existAccount.save();
        var host = req.protocol + '://' + req.host;

        sendPasswordResetMail(existAccount.email, { link: host + '/account/update-password/' + randomToken });

        res.render('reset-password', params);
    });
};

exports.updatePasswordForm = function (req, res) {
    if (req.isAuthenticated()) return res.redirect('/');

    req.assert('token', 'Secret token cannot be empty').notEmpty();

    var errors = req.validationErrors();

    if (errors) {
        req.flash('info', { msg: 'Token is not valid' });
        return res.redirect('/login');
    }

    Account.findOne({ resetPasswordToken: req.param('token')})
        .where('resetPasswordTokenExpires').gt(Date.now())
        .exec(function(err, user) {
            if (!user) {
                req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
                return res.redirect('/account/reset-password');
            }
            res.render('update-password', { resetAccount: user });
        });
};

exports.updatePassword = function (req, res, next) {
    req.assert('password', 'Password must be at least 4 characters long.').len(4);
    req.assert('confirmPassword', 'Passwords must match.').equals(req.param('password'));

    var errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('back');
    }

    Account
        .findOne({ resetPasswordToken: req.param('token') })
        .where('resetPasswordTokenExpires').gt(Date.now())
        .exec(function(err, accountForReset) {
            if (!accountForReset) {
                req.flash('errors', { msg: 'Password reset token is invalid or has expired.' });
                return res.redirect('back');
            }

            accountForReset.password = req.param('password');
            accountForReset.resetPasswordToken = undefined;
            accountForReset.resetPasswordTokenExpires = undefined;

            // force Login process
            accountForReset.save(function(err) {
                if (err) return next(err);
                req.logIn(accountForReset, function(err) {
                    if (err) return next(err);
                    res.redirect('/');
                });
            });
        });
};