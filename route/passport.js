/**
 * Created by soomtong on 2014. 7. 3..
 */

var _ = require('lodash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var Account = require('./../model/account');
var Logging = require('../model/accountLog');

var passportSecretToken = require('../config/passport');

passport.serializeUser(function(user, callback) {
    callback(null, user.id);
});

passport.deserializeUser(function(id, callback) {
    Account.findById(id, function(err, user) {
        callback(err, user);
    });
});

// Sign in using Email and Password.
passport.use(new LocalStrategy({ usernameField: 'email' }, function(email, password, callback) {
    Account.findOne({ email: email }, function(err, user) {
        if (!user) return callback(null, false, { message: 'Email ' + email + ' not found'});
        user.comparePassword(password, function(err, isMatch) {
            if (isMatch) {
                return callback(null, user);
            } else {
                return callback(null, false, { message: 'Invalid email or password.' });
            }
        });
    });
}));

// Sign in with Twitter.
passport.use(new TwitterStrategy(passportSecretToken['twitter'], function(req, accessToken, tokenSecret, profile, callback) {
    // 트위터와 연동된 계정 생성 및 저장
    Account.findOne({ twitter: profile.id }, function(err, existingUser) {
        if (existingUser) return callback(null, existingUser);
        var user = new Account();
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
            callback(err, user);
        });
    });
}));

// Sign in with Facebook.
passport.use(new FacebookStrategy(passportSecretToken['facebook'], function(req, accessToken, refreshToken, profile, callback) {
    Account.findOne({ facebook: profile.id }, function(err, existingUser) {
        if (existingUser) return callback(null, existingUser);
        Account.findOne({ email: profile._json.email }, function(err, existingEmailUser) {
            if (existingEmailUser) {
                req.flash('errors', { msg: 'There is already an account using this email address. Sign in to that account and link it with Facebook manually from Account Settings.' });
                callback(err);
            } else {
                var user = new Account();
                user.email = profile._json.email;
                user.facebook = profile.id;
                user.tokens.push({ kind: 'facebook', accessToken: accessToken });
                user.profile.name = profile.displayName;
                user.profile.gender = profile._json.gender;
                user.profile.picture = 'https://graph.facebook.com/' + profile.id + '/picture?type=large';
                user.profile.location = (profile._json.location) ? profile._json.location.name : '';
                user.save(function(err) {
                    callback(err, user);
                });
            }
        });
    });
}));

// Sign in with Google.

passport.use(new GoogleStrategy(passportSecretToken['google'], function(req, accessToken, refreshToken, profile, done) {
  if (req.user) {
    Account.findOne({ google: profile.id }, function(err, existingUser) {
      if (existingUser) {
        req.flash('errors', { msg: 'There is already a Google account that belongs to you. Sign in with that account or delete it, then link it with your current account.' });
        done(err);
      } else {
        Account.findById(req.user.id, function(err, user) {
          user.google = profile.id;
          user.tokens.push({ kind: 'google', accessToken: accessToken });
          user.profile.name = user.profile.name || profile.displayName;
          user.profile.gender = user.profile.gender || profile._json.gender;
          user.profile.picture = user.profile.picture || profile._json.picture;
          user.save(function(err) {
            req.flash('info', { msg: 'Google account has been linked.' });
            done(err, user);
          });
        });
      }
    });
  } else {
    Account.findOne({ google: profile.id }, function(err, existingUser) {
      if (existingUser) return done(null, existingUser);
      Account.findOne({ email: profile._json.email }, function(err, existingEmailUser) {
        if (existingEmailUser) {
          req.flash('errors', { msg: 'There is already an account using this email address. Sign in to that account and link it with Google manually from Account Settings.' });
          done(err);
        } else {
          var user = new Account();
          user.email = profile._json.email;
          user.google = profile.id;
          user.tokens.push({ kind: 'google', accessToken: accessToken });
          user.profile.name = profile.displayName;
          user.profile.gender = profile._json.gender;
          user.profile.picture = profile._json.picture;
          user.save(function(err) {
            done(err, user);
          });
        }
      });
    });
  }
}));


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