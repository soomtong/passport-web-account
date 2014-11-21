/**
 * Created by soomtong on 2014. 7. 2..
 */

// set global env
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Core Utility
var path = require('path');

// Module dependency
var express = require('express');
var compress = require('compression');
var bodyParser = require('body-parser');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var swig = require('swig');
var expressValidator = require('express-validator');

// Secret Token
var common = require('./config/common');
var database = require('./config/database');

// Load Pipe
var Pipe = require('pipe');
var Passport = Pipe.Passport;

// Route Controller
var apiController = require('./route/api');
var middleware = require('./route/middleware');

// Start Body
var app = express();

// Express configuration.
app.set('hostEnv', process.env.NODE_ENV);
app.set('port', process.env.PORT || common['port']);
app.set('views', path.join(__dirname, 'views'));
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('view cache', false);
swig.setDefaults({cache: false});

app.use(compress());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressValidator({
    errorFormatter: function (param, msg, value) {
        var namespace = param.split('.')
            , root = namespace.shift()
            , formParam = root;

        while (namespace.length) {
            formParam += '[' + namespace.shift() + ']';
        }
        return {
            param: formParam,
            msg: msg,
            value: value
        };
    }
}));

app.use(Passport.initialize());

app.use(function (req, res, callback) {
    // Make user object available in templates.
    res.locals.user = req.user;
    res.locals.site = {
        title: "Haroo Cloud Service Hub",
        url: common['clientAuthUrl'],
        dbHost: database['couch']['host'],
        mailHost: common['mailServer']
    };
    callback();
});

// for nginx proxy
/*
 app.set('trust proxy', function (ip) {
 if (ip === '127.0.0.1' || ip === '123.123.123.123') return true; // trusted IPs
 else return false;
 })
*/
if (app.get('hostEnv') != 'development') {
    app.enable('trust proxy');  // using Express behind nginx
    app.use(logger('combined'));
} else {
    app.use(logger('dev'));
}

// Route Point prefix hosted in nginx with '/api'
// Watch Out this order for middleware. caution!

// api list for developers
app.get('/', function (req, res) {
    res.json({msg: common['welcomeMsg'], rev: common['welcomeRev']});
});
app.get('/api', function (req, res) {
    res.render('index');
});


// api counter for ip district
app.use(middleware.callCounterForIPs);

// set host name to res.locals for all client
app.use(middleware.accessHost);

// for account
app.post('/api/account/create', apiController.createAccount);
app.post('/api/account/login', apiController.readAccount);
app.post('/api/account/forgot_password', apiController.forgotPassword);

// should need a header token
app.use(middleware.accessToken);

// api counter for token district
app.use(middleware.callCounterForToken);

// for token
app.post('/api/token/validate', apiController.validateToken);

// for user
app.post('/api/user/:haroo_id/info', apiController.accountInfo);
app.post('/api/user/:haroo_id/change_password', apiController.updatePassword);
app.post('/api/user/:haroo_id/update_info', apiController.updateAccountInfo);
app.post('/api/user/:haroo_id/logout', apiController.dismissAccount);
app.post('/api/user/:haroo_id/delete', apiController.removeAccount);

// for external service
app.post('/api/account/link', apiController.linkAuth);
app.post('/api/account/unlink', apiController.unlinkAuth);
app.post('/api/account/check_link', apiController.checkLinkAuth);

app.get('/api/auth/twitter', Passport.authenticate('twitter'));
app.get('/api/auth/twitter/callback', apiController.linkExternalAccount);

app.get('/api/auth/facebook', Passport.authenticate('facebook', {scope: ['email', 'user_location']}));
app.get('/api/auth/facebook/callback', apiController.linkExternalAccount);

app.get('/api/auth/google', Passport.authenticate('google', {scope: 'profile email'}));
app.get('/api/auth/google/callback', apiController.linkExternalAccount);

// 500 Error Handler
app.use(errorHandler());

// Start Express server
app.listen(app.get('port'), function () {
    console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('hostEnv'));
});

module.exports = app;
