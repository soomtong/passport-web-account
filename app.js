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
var useragent = require('express-useragent');

var _ = require('lodash');
var MongoStore = require('connect-mongo')({ session: session });
var flash = require('express-flash');
var mongoose = require('mongoose');
var passport = require('passport');
var expressValidator = require('express-validator');
//var connectAssets = require('connect-assets');


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

mongoose.connect(database['mongo'].host);
mongoose.connection.on('error', function() {
    console.error('MongoDB Connection Error. Make sure MongoDB is running.');
});


// Constant
var HOUR = 3600000;
var DAY = HOUR * 24;
var WEEK = DAY * 7;


// CSRF whitelist
var CSRFEXCLUDE = ['/api/account/create', '/api/account/read', '/api/account/dismiss', '/api/account/update', '/api/account/remove',
    '/api/account/link', '/api/account/unlink', '/api/account/access', '/api/account/forgot_password', '/api/account/haroo_id'];


// Express configuration.
app.set('hostEnv', process.env.NODE_ENV);
app.set('port', process.env.PORT || common['port']);
app.set('views', path.join(__dirname, 'views'));
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('view cache', false);
swig.setDefaults({ cache: false });

app.use(compress());
/*
app.use(connectAssets({
    paths: ['public/css', 'public/js'],
    helperContext: app.locals
}));
*/

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
        url: database['mongo'].host,
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
        title: "Haroo Cloud Service Hub",
        url: app.get('hostEnv') == 'production' ? common['clientAuthUrl'] : '//localhost:' + common['port'],
        dbHost: database['couch']['host'],
        mailHost: common['mailServer']
    };
    callback();
});
app.use(function(req, res, callback) {
    // Remember original destination before login.
    var path = req.path.split('/')[1];

    if (/auth|api|login|logout|signup|components|css|img|js|favicon/i.test(path) || path == '') {
        return callback();
    }
    req.session.returnTo = req.path;
    callback();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: WEEK }));


// Route Point
app.get('/', function (req, res) {
    var params = {
    };

    req.session.clientRoute = null;
/*
    if (req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.render('index', params);
    }
*/

    res.render('index', params);

});
app.get('/download', useragent.express(), function (req, res) {
    var params = {
        isDesktop: req.useragent.isDesktop,
        isMac: req.useragent.isMac,
        isWindows: req.useragent.isWindows,
        isLinux: req.useragent.isLinux,
        isLinux64: req.useragent.isLinux64
    };
    var haroonoteAppUrl = '/';

    if (!params.isDesktop) {
        res.render('index', params);
    } else {
        if (params.isMac) haroonoteAppUrl = '/get/mac';
        if (params.isLinux) haroonoteAppUrl = '/get/linux';
        if (params.isLinux64) haroonoteAppUrl = '/get/linux64';
        if (params.isWindows) haroonoteAppUrl = '/get/windows';

        res.redirect(haroonoteAppUrl);
    }
});
app.get('/get/mac', function (req, res) {
    res.redirect(common['appDownloadUrl']['MAC']);
});
app.get('/get/linux', function (req, res) {
    res.redirect(common['appDownloadUrl']['LINUX']);
});
app.get('/get/linux64', function (req, res) {
    res.redirect(common['appDownloadUrl']['LINUX64']);
});
app.get('/get/linux-deb', function (req, res) {
    res.redirect(common['appDownloadUrl']['LINUX-DEB']);
});
app.get('/get/linux64-deb', function (req, res) {
    res.redirect(common['appDownloadUrl']['LINUX64-DEB']);
});
app.get('/get/windows', function (req, res) {
    res.redirect(common['appDownloadUrl']['WINDOWS']);
});

app.get('/login', accountController.loginForm);
app.post('/login', accountController.login);
app.get('/logout', accountController.logout);
app.get('/signup', accountController.signUpForm);
app.post('/signup', accountController.signUp);

app.get('/account', accountController.isAuthenticated, accountController.accountInfo);
app.post('/account/profile', accountController.isAuthenticated, accountController.updateProfile);
app.post('/account/password', accountController.isAuthenticated, accountController.updatePassword);
app.post('/account/delete', accountController.isAuthenticated, accountController.deleteAccount);
app.get('/account/unlink/:provider', accountController.isAuthenticated, accountController.unlinkAccount);

app.get('/account/reset-password', accountController.resetPasswordForm);
app.post('/account/reset-password', accountController.resetPassword);
app.get('/account/update-password/:token?', accountController.updatePasswordForm);
app.post('/account/update-password/:token?', accountController.updatePasswordForReset);

// for only client embedded web page
app.get('/api/login', apiController.loginForm);
app.post('/api/login', apiController.login);
app.get('/api/logout', apiController.logout);
app.post('/api/logout', apiController.logout);
app.get('/api/loginDone', apiController.loginDone);
app.get('/api/signup', apiController.signUpForm);
app.post('/api/signup', apiController.signUp);

// for only api access
app.post('/api/account/haroo_id', apiController.haroo_id);
app.post('/api/account/access', apiController.access_token);
app.post('/api/account/create', apiController.createAccount);
app.post('/api/account/read', apiController.readAccount);
app.post('/api/account/dismiss', apiController.dismissAccount);
app.post('/api/account/update', apiController.updateAccount);
app.post('/api/account/remove', apiController.removeAccount);
app.post('/api/account/forgot_password', apiController.forgotPassword);
app.post('/api/account/unlink', apiController.unlinkAuth);
app.post('/api/account/check', apiController.checkLinkAuth);
app.post('/api/account/link', apiController.linkAuth);

app.get('/auth/token', function (req, res) {
    //check token expired?
    return res.end();
});

app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/auth/twitter/callback', apiController.linkExternalAccount);

app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'user_location'] }));
app.get('/auth/facebook/callback', apiController.linkExternalAccount);

app.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }));
app.get('/auth/google/callback', apiController.linkExternalAccount);

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
