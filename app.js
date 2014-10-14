/**
 * Created by soomtong on 2014. 7. 2..
 */

// set global env
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Core Utility
var path = require('path');

// Module dependency
var express = require('express');
var cookieParser = require('cookie-parser');
var compress = require('compression');
var session = require('express-session');
var bodyParser = require('body-parser');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var csrf = require('lusca').csrf();
var methodOverride = require('method-override');
var swig = require('swig');

var _ = require('lodash');
var MongoStore = require('connect-mongo')({ session: session });
var flash = require('express-flash');
var mongoose = require('mongoose');
var passport = require('passport');
var expressValidator = require('express-validator');
var connectAssets = require('connect-assets');


// Secret Token
var common = require('./config/common');
var database = require('./config/database');

// Load passport strategy
require('./route/passport');

// Route Controller
var dashboardController = require('./route/dashboard');
var accountController = require('./route/account');
var apiController = require('./route/api');


// Start Body
var app = express();

mongoose.connect(database['mongo'].url);
mongoose.connection.on('error', function() {
    console.error('MongoDB Connection Error. Make sure MongoDB is running.');
});


// Constant
var HOUR = 3600000;
var DAY = HOUR * 24;
var WEEK = DAY * 7;


// CSRF whitelist
var CSRFEXCLUDE = ['/api/account/create', '/api/account/read', '/api/account/dismiss', '/api/account/update', '/api/account/remove',
    '/api/account/link', '/api/account/unlink', '/api/account/access', '/api/haroo-id'];


// Express configuration.
app.set('port', process.env.PORT || common['port']);
app.set('views', path.join(__dirname, 'views'));
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('view cache', false);
swig.setDefaults({ cache: false });

app.use(compress());
app.use(connectAssets({
    paths: ['public/css', 'public/js'],
    helperContext: app.locals
}));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(methodOverride());
app.use(cookieParser());
app.use(session({
    secret: common['sessionSecret'],
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({
        url: database['mongo'].url,
        auto_reconnect: true
    })
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(function(req, res, callback) {
    // CSRF protection.
    console.log(req.path);
    if (_.contains(CSRFEXCLUDE, req.path)) return callback();
    csrf(req, res, callback);
});
app.use(function(req, res, callback) {
    // Make user object available in templates.
    res.locals.user = req.user;
    res.locals.site = {
        title: "Haroo Cloud Service Hub"
    };
    callback();
});
app.use(function(req, res, callback) {
    // Remember original destination before login.
    var path = req.path.split('/')[1];
    if (/auth|login|logout|signup|favicon/i.test(path)) {
        return callback();
    }
    req.session.returnTo = req.path;
    callback();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: WEEK }));


// Route Point
app.get('/', function (req, res) {
    var params = {};
    res.render('index', params);
});
app.get('/login', accountController.loginForm);
app.post('/login', accountController.login);
app.get('/logout', accountController.logout);

app.get('/signup', accountController.signUpForm);
app.post('/signup', accountController.signUp);

app.get('/account', accountController.isAuthenticated, accountController.accountInfo);
app.post('/account/profile', accountController.isAuthenticated, accountController.udpateProfile);
app.post('/account/password', accountController.isAuthenticated, accountController.updatePassword);
app.post('/account/delete', accountController.isAuthenticated, accountController.deleteAccount);
app.get('/account/unlink/:provider', accountController.isAuthenticated, accountController.unlinkAccount);

app.get('/account/reset-password', accountController.resetPasswordForm);
app.post('/account/reset-password', accountController.resetPassword);
app.get('/account/update-password/:token?', accountController.updatePasswordForm);
app.post('/account/update-password/:token?', accountController.updatePassword);

app.get('/api/haroo-id/:harooID', apiController.harooID);
app.post('/api/haroo-id', apiController.harooID);
app.post('/api/account/create', apiController.createAccount);
app.post('/api/account/read', apiController.readAccount);
app.post('/api/account/dismiss', apiController.dismissAccount);
app.post('/api/account/update', apiController.updateAccount);
app.post('/api/account/remove', apiController.removeAccount);
app.post('/api/account/access', apiController.accessAccount);
app.post('/api/account/unlink', apiController.unlinkAuth);
app.post('/api/account/link', apiController.linkAuth);

app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback', passport.authenticate('twitter', { successRedirect: '/', failureRedirect: '/login' }), apiController.createTwitterAccount);

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'user_location'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), apiController.createFacebookAccount);

app.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), apiController.createGoogleAccount);

// dashboard and user custom urls should below above all routes
app.get('/dashboard', accountController.isAuthenticated, dashboardController.index);
app.get('/dashboard/list', accountController.isAuthenticated, dashboardController.list);
app.get('/dashboard/:view_id', accountController.isAuthenticated, dashboardController.documentView);
app.post('/dashboard/:view_id/update', accountController.isAuthenticated, dashboardController.documentUpdate);
app.get('/p/:view_id', accountController.isAuthenticated, dashboardController.documentPublicView);
// todo: public address
app.get('/p/:user_id/:publicUrl', function (req, res) {
    var params = {
        userID: req.param('user_id'),
        publicUrl: req.param('publicUrl')
    };

    // check that doc is public?
    // retrieve meta.share value from publicUrl

    console.log(params);
    res.send(params);
});

// 500 Error Handler
app.use(errorHandler());


// Start Express server
app.listen(app.get('port'), function() {
    console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('hostEnv'));
});

module.exports = app;
