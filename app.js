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
var methodOverride = require('method-override');
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
mongoose.connection.on('error', function() {
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
swig.setDefaults({ cache: false });

app.use(compress());

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(methodOverride());

app.use(passport.initialize());

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

// Route Point prefix hosted in nginx with '/api'
app.get('/', function (req, res) {
    res.send(common['welcomeMsg'] + ' : ' + common['welcomeRev']);
});

// for only client embedded web page
app.get('/login', apiController.loginForm);
app.post('/login', apiController.login);
app.get('/logout', apiController.logout);
app.post('/logout', apiController.logout);
app.get('/loginDone', apiController.loginDone);
app.get('/signup', apiController.signUpForm);
app.post('/signup', apiController.signUp);

// for only api access
app.post('/account/get_haroo_id', function (req, res) {
    res.json({haroo_id: 'new id'});
});
app.post('/account/haroo_id', apiController.haroo_id);
app.post('/account/access', apiController.access_token);
app.post('/account/create', apiController.createAccount);
app.post('/account/read', apiController.readAccount);
app.post('/account/dismiss', apiController.dismissAccount);
app.post('/account/update', apiController.updateAccount);
app.post('/account/remove', apiController.removeAccount);
app.post('/account/forgot_password', apiController.forgotPassword);
app.post('/account/unlink', apiController.unlinkAuth);
app.post('/account/check', apiController.checkLinkAuth);
app.post('/account/link', apiController.linkAuth);

// for haroonote app
app.post('/:haroo_id/info', haroonoteController.haroo_id);

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


// 500 Error Handler
app.use(errorHandler());


// Start Express server
app.listen(app.get('port'), function() {
    console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('hostEnv'));
});

module.exports = app;
