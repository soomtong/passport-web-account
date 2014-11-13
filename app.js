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
var session = require('express-session');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var swig = require('swig');

var mongoose = require('mongoose');
var passport = require('passport');
var expressValidator = require('express-validator');


// Secret Token
var common = require('./config/common');
var database = require('./config/database');

// Load passport strategy
require('./route/passport');

// Route Controller
var apiController = require('./route/api');
var haroonoteController = require('./route/haroonote');


// Start Body
var app = express();

mongoose.connect(database['mongo'].host);
mongoose.connection.on('error', function () {
    console.error('MongoDB Connection Error. Make sure MongoDB is running.');
});


// Constant
var HOUR = 3600000;
var DAY = HOUR * 24;
var WEEK = DAY * 7;


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
app.use(session({
    secret: common['sessionSecret'],
    resave: true,
    saveUninitialized: true
}));
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

app.use(passport.initialize());

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
if (app.get('hostEnv') != 'development') {
    app.enable('trust proxy');  // using Express behind nginx
    app.use(logger('combined'));
} else {
    app.use(logger('dev'));
}

// Route Point prefix hosted in nginx with '/api'

// api list for developers
app.get('/', function (req, res) {
    res.json({msg: common['welcomeMsg'], rev: common['welcomeRev']});
});
app.get('/api', function (req, res) {
    res.render('index');
});

// todo: use access token check middleware here for the future
//app.use(apiController.accessTokenMiddleware);

// todo: redesign restful
app.post('/api/account/haroo_id', apiController.createHarooID);
app.post('/api/account/info', apiController.accountInfo);
app.post('/api/account/access', apiController.readAccessToken);
app.post('/api/account/create', apiController.createAccount);
app.post('/api/account/read', apiController.readAccount);
app.post('/api/account/dismiss', apiController.dismissAccount);
app.post('/api/account/update', apiController.updateAccount);
app.post('/api/account/remove', apiController.removeAccount);
app.post('/api/account/forgot_password', apiController.forgotPassword);
app.post('/api/account/unlink', apiController.unlinkAuth);
app.post('/api/account/check', apiController.checkLinkAuth);
app.post('/api/account/link', apiController.linkAuth);

// will be removed for test
app.use(apiController.accessTokenMiddleware);

// for token
app.post('/api/token/validate', haroonoteController.validateToken);
// for user
app.post('/api/user/:haroo_id/info', haroonoteController.accountInfo);
app.post('/api/user/:haroo_id/change_password', haroonoteController.updatePassword);


app.get('/api/auth/twitter', passport.authenticate('twitter'));
app.get('/api/auth/twitter/callback', apiController.linkExternalAccount);

app.get('/api/auth/facebook', passport.authenticate('facebook', {scope: ['email', 'user_location']}));
app.get('/api/auth/facebook/callback', apiController.linkExternalAccount);

app.get('/api/auth/google', passport.authenticate('google', {scope: 'profile email'}));
app.get('/api/auth/google/callback', apiController.linkExternalAccount);


// 500 Error Handler
app.use(errorHandler());


// Start Express server
app.listen(app.get('port'), function () {
    console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('hostEnv'));
});

module.exports = app;
