var _ = require('lodash');
var passport = require('passport');
var uuid = require('node-uuid');

var Account = require('../model/account');
var Logging = require('../model/accountLog');

var Code = require('../model/code');


exports.logout = function(req, res) {
    req.logout();
    res.redirect('/');
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
            var localToken = { kind: 'haroo-cloud', accessToken: uuid.v1() };

            user.tokens.push(localToken);

            user.save(function(err) {
                if (err) {
                    res.redirect('/signup');
                }
                req.logIn(user, function (err) {
                    if (err) return next(err);
                    res.redirect('/');

                    var log = new Logging({
                        email: req.param('email'),
                        createdAt: new Date()
                    });

                    log.save();

                });
            });
        }
    });
};
