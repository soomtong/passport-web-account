/**
 * Created by soomtong on 2014. 7. 2..
 */
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

// Route Controller
var passportController = require('./route/passport');
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
var CSRFEXCLUDE = ['/api/account/create', '/api/account/read'];


// Express configuration.
app.set('port', process.env.PORT || common['port']);
app.set('views', path.join(__dirname, 'views'));
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
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
app.use(function(req, res, next) {
    // CSRF protection.
    if (_.contains(CSRFEXCLUDE, req.path)) return next();
    csrf(req, res, next);
});
app.use(function(req, res, next) {
    // Make user object available in templates.
    res.locals.user = req.user;
    next();
});
app.use(function(req, res, next) {
    // Remember original destination before login.
    var path = req.path.split('/')[1];
    if (/auth|login|logout|signup|favicon/i.test(path)) {
        return next();
    }
    req.session.returnTo = req.path;
    next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: WEEK }));


// Route Point
app.get('/', function (req, res) {
    res.send('ok');
});

app.post('/api/account/create', apiController.createAccount);
app.post('/api/account/read', apiController.readAccount);
app.post('/api/account/update', apiController.updateAccount);
app.post('/api/account/remove', apiController.removeAccount);

// 500 Error Handler
app.use(errorHandler());


// Start Express server
app.listen(app.get('port'), function() {
    console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

module.exports = app;