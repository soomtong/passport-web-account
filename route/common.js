/**
 * Created by soomtong on 2014. 10. 15..
 */
var uid = require('shortid');
var uuid = require('node-uuid');
var nodemailer = require('nodemailer');
var emailToken = require('../config/mailer')['email-token'];
var emailTemplates = require('swig-email-templates');

var AccountLog = require('../model/accountLog');

var HOUR = 3600000;
var DAY = HOUR * 24;

function saveAccountAccessLog(type, userEmail) {
    var log = new AccountLog();

    log.email = userEmail;
    log[type] = new Date();

    log.save();
}

function saveAccountLinkLog(provider, userEmail) {
    var log = new AccountLog({
        provider: provider,
        email: userEmail,
        linked_at: new Date()
    });

    log.save();
}

function saveAccountUpdateLog(userEmail) {
    var log = new AccountLog({
        email: userEmail,
        updated_at: new Date()
    });

    log.save();
}

function saveSignInLog(userEmail) {
    var log = new AccountLog({
        email: userEmail,
        signed_in: new Date()
    });

    log.save();
}

function saveSignOutLog(userEmail) {
    var log = new AccountLog({
        email: userEmail,
        signed_out: new Date()
    });

    log.save();
}

function saveSignUpLog(userEmail) {
    var log = new AccountLog({
        email: userEmail,
        created_at: new Date()
    });

    log.save();
}

function saveUnlinkLog(userEmail) {
    var log = new AccountLog({
        email: userEmail,
        unlinked_at: new Date()
    });

    log.save();
}

function saveAccountRemoveLog(userEmail) {
    var log = new AccountLog({
        email: userEmail,
        removed_at: new Date()
    });

    log.save();
}

function getToday() {
    return new Date().toISOString().slice(0, 10);
}

function getHarooID() {
    return 'A' + (getToday().toString()).replace(/-/g,'') + '-' + uid.generate();
}

function getAccessToken() {
//    return uuid.v1();
    return uuid.v4();
}

function getExpireDate() {
    return Date.now() + ( 15 * DAY );
}

function getPasswordResetExpire() {
    return Date.now() + Number(DAY);
}

function setAccountToClient(codeStub, userData) {
    var result = codeStub;
    result.email = userData.email;
    result.haroo_id = userData.haroo_id;
    result.login_expire = userData.login_expire;
    result.profile = userData.profile;
    if (userData.access_token) {
        result.access_token = userData.access_token;
    }
    if (userData.provider) {
        result.provider = userData.provider;
        result.tokens = userData.tokens;
    }

    return result;
}

function sendPasswordResetMail(address, context) {
    var smtpTransport = nodemailer.createTransport(emailToken);

    emailTemplates({ root: __dirname + "/templates" }, function (error, render) {
        var email = {
            from: emailToken['reply'], // sender address
            to: address,
//            bcc: emailToken.bcc,
            subject: "Reset your password link described"
        };

        render('password_reset_email.html', context, function (error, html) {
            console.log(html);
            email.html = html;
            smtpTransport.sendMail(email, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log("Message sent: " + info.response);
                }

                // if you don't want to use this transport object anymore, uncomment following line
                smtpTransport.close(); // shut down the connection pool, no more messages
            });
        });
    });
}



module.exports = {
    getToday: getToday,
    getHarooID: getHarooID,
    getAccessToken: getAccessToken,
    getLoginExpireDate: getExpireDate,
    saveAccountAccessLog: saveAccountAccessLog,
    saveAccountLinkLog: saveAccountLinkLog,
    saveSignUpLog: saveSignUpLog,
    saveSignInLog: saveSignInLog,
    saveSignOutLog: saveSignOutLog,
    saveUnlinkLog: saveUnlinkLog,
    saveAccountUpdateLog: saveAccountUpdateLog,
    saveAccountRemoveLog: saveAccountRemoveLog,
    setAccountToClient: setAccountToClient,
    sendPasswordResetMail: sendPasswordResetMail,
    getPasswordResetExpire: getPasswordResetExpire
};