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
        var accessToken = res.locals.token;

        if (existUser && (existUser.access_token == accessToken)) {
            result = Code.account.haroo_id.reserved;

            // expired?
            var now = Date.now();

            if (existUser.login_expire > now) {
                // login session
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