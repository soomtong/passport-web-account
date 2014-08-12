var passport = require('passport');
var uuid = require('node-uuid');

var Account = require('../model/account');
var Logging = require('../model/accountLog');

var Code = require('../model/code');

function saveLog(type, userEmail) {
    var log = new Logging();

    log.email = userEmail;
    log[type] = new Date();

    log.save();
}

exports.logout = function(req, res) {
    if (req.user) {
        var userEmail = req.user['email'];
        Logging.findOneAndUpdate({ email: userEmail }, { signedOut: new Date() }, { sort: { _id : -1 } },
            function (err, lastLog) {
                if (!lastLog) {
                    saveLog('signedOut', userEmail);
                }
            });
    }

    req.logout();
    res.redirect('/');
};

exports.loginForm = function (req, res) {
    var params = {};
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

            saveLog('signedIn', req.param('email'));

        });
    })(req, res, callback);
};

exports.signUpForm = function (req, res) {
    var params = {};
    if (req.user) return res.redirect('/');
    res.render('signup', params);
};

exports.signUp = function (req, res) {
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
        uuid: uuid.v1(),
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

            return res.redirect('/signup');
        } else {
            user.save(function(err) {
                if (err) {
                    res.redirect('/signup');
                }
                req.logIn(user, function (err) {
                    if (err) return next(err);
                    res.redirect('/');

                    saveLog('createdAt', req.param('email'));

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