/**
 * Created by soomtong on 2014. 7. 3..
 */

var _ = require('lodash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;

var User = require('./../model/account');
var Logging = require('../model/accountLog');

var passportSecretToken = require('../config/passport');

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

// Sign in using Email and Password.
passport.use(new LocalStrategy({ usernameField: 'email' }, function(email, password, done) {
    User.findOne({ email: email }, function(err, user) {
        if (!user) return done(null, false, { message: 'Email ' + email + ' not found'});
        user.comparePassword(password, function(err, isMatch) {
            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Invalid email or password.' });
            }
        });
    });
}));

// Sign in with Twitter.
passport.use(new TwitterStrategy(passportSecretToken.twitter, function(req, accessToken, tokenSecret, profile, done) {
    if (req.user) {
        // 서버 세션에 로그인 되어 있을 경우
        User.findOne({ twitter: profile.id }, function(err, existingUser) {
            if (existingUser) {
                // 트위터와 연동된 계정 데이터가 있을 경우
                console.log('find that user');
                req.flash('errors', { msg: 'There is already a Twitter account that belongs to you. Sign in with that account or delete it, then link it with your current account.' });
                done(err, req.user);
            } else {
                // 트위터와 연동된 계정 데이터가 없을 경우 트위터 계정정보를 추가한다.
                User.findById(req.user.id, function(err, user) {
                    user.twitter = profile.id;
                    user.tokens.push({ kind: 'twitter', accessToken: accessToken, tokenSecret: tokenSecret });
                    user.profile.name = user.profile.name || profile.displayName;
                    user.profile.location = user.profile.location || profile._json.location;
                    user.profile.picture = user.profile.picture || profile._json.profile_image_url;
                    user.save(function(err) {
                        req.flash('info', { msg: 'Twitter account has been linked.' });

                        done(err, user);
                    });
                });
            }
        });
    } else {
        // 트위터와 연동된 계정 생성 및 저장
        User.findOne({ twitter: profile.id }, function(err, existingUser) {
            if (existingUser) return done(null, existingUser);
            var user = new User();
            // Twitter will not provide an email address.  Period.
            // But a person’s twitter username is guaranteed to be unique
            // so we can "fake" a twitter email address as follows:
            user.email = profile.username + "@twitter.com";
            user.twitter = profile.id;
            user.tokens.push({ kind: 'twitter', accessToken: accessToken, tokenSecret: tokenSecret });
            user.profile.name = profile.displayName;
            user.profile.location = profile._json.location;
            user.profile.picture = profile._json.profile_image_url;
            user.save(function(err) {
                done(err, user);
            });
        });
    }
}));

// Login Required middleware.
exports.isAuthenticated = function(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/login');
};

// Authorization Required middleware.
exports.isAuthorized = function(req, res, next) {
    var provider = req.path.split('/').slice(-1)[0];

    if (_.find(req.user.tokens, { kind: provider })) {
        next();
    } else {
        res.redirect('/auth/' + provider);
    }
};