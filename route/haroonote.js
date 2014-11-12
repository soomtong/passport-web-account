var _ = require('lodash');
var passport = require('passport');
var uuid = require('node-uuid');

var Account = require('../model/account');
var Logging = require('../model/accountLog');
var AccountInit = require('../model/accountInit');

var Code = require('../model/code');
var common = require('./common');


exports.accountInfo = function (req, res) {
    req.assert('haroo_id', 'haroo_id must be at least 4 characters long').len(4);

    var result = {};
    var errors = req.validationErrors();

    if (errors) {
        result = Code.account.haroo_id.validation;
        result.validation = errors;

        res.send(result);
        return;
    }

    Account.findOne({haroo_id: req.param('haroo_id')}, function (err, existUser) {
        if (err) {
            result = Code.account.haroo_id.database;
            result.passport = err;
            res.send(result);

            return;
        }

        var accessToken = res.locals.token;

        if (existUser && (existUser.access_token == accessToken)) {
            result = Code.account.haroo_id.reserved;

            // expired?
            var now = Date.now();

            if (existUser.login_expire > now) {
                common.saveAccountAccessLog('signed_in', req.param('email'));

                result = common.setAccountToClient(Code.account.haroo_id.success, existUser);

                res.send(result);
            } else {
                result = Code.account.haroo_id.expired;

                res.send(result);
            }
        } else {
            result = Code.account.haroo_id.invalid;

            res.send(result);
        }
    });
};

exports.updatePassword = function (req, res) {
    req.assert('email', 'Email is not valid').isEmail();
    req.assert('password', 'Password must be at least 4 characters long').len(4);

    var result = {};
    var errors = req.validationErrors();

    if (errors) {
        result = Code.account.update.validation;
        result.validation = errors;

        res.send(result);
        return;
    }

    Account.findOne({haroo_id: req.param('haroo_id'), email: req.param('email')}, function(err, updateUser) {
        if (err) {
            result = Code.account.haroo_id.database;
            result.passport = err;
            res.send(result);

            return;
        }

        var accessToken = res.locals.token;

        if (updateUser && (updateUser.access_token == accessToken)) {
            result = Code.account.update.done;

            var now = Date.now();

            if (updateUser.login_expire > now) {
                updateUser.password = req.param('password');
                updateUser.access_token = common.getAccessToken();
                updateUser.login_expire = common.getLoginExpireDate();

                updateUser.save(function(err) {
                    if (err) {
                        result = Code.account.update.database;
                        result.db_info = err;
                        res.send(result);

                        return;
                    }

                    // good
                    common.saveAccountAccessLog('change_password', req.param('email'));

                    result = common.setAccountToClient(Code.account.update.done, updateUser);

                    res.send(result);
                });
            } else {
                result = Code.account.haroo_id.expired;

                res.send(result);
            }
        } else {
            result = Code.account.haroo_id.invalid;

            res.send(result);
        }
    });
};