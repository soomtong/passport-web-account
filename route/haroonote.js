var _ = require('lodash');
var passport = require('passport');
var uuid = require('node-uuid');

var Account = require('../model/account');
var Logging = require('../model/accountLog');
var AccountInit = require('../model/accountInit');

var Code = require('../model/code');
var common = require('./common');


exports.haroo_id = function (req, res) {
    req.assert('haroo_id', 'haroo_id must be at least 4 characters long').len(4);
    req.assert('access_token', 'haroo_id have to need access token for retrieve').notEmpty();

    var errors = req.validationErrors();

    var result = {};

    if (errors) {
        result = Code.account.haroo_id.validation;

        res.send(result);
        return;
    }

    Account.findOne({ haroo_id: req.param('haroo_id') }, function(err, existUser) {
        //  todo: should check access token
        if (existUser && (existUser.readAccessToken == req.param('access_token'))) {
            result = Code.account.haroo_id.reserved;

            // expired?
            var now = Date.now();

            if (existUser.login_expire > now) {
                // login session
                req.logIn(existUser, function(err) {
                    if (err) {
                        result = Code.account.haroo_id.database;
                        result.info = err;

                        res.send(result);
                    } else {
                        common.saveAccountAccessLog('signed_in', req.param('email'));

                        result = common.setAccountToClient(Code.account.haroo_id.success, existUser);

                        res.send(result);
                    }
                });
            } else {
                result = Code.account.haroo_id.expired;

                res.send(result);
            }
        } else {
            result = Code.account.haroo_id.available;

            res.send(result);
        }
    });
}