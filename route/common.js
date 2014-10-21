/**
 * Created by soomtong on 2014. 10. 15..
 */
var uid = require('shortid');
var uuid = require('node-uuid');

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
        linkedAt: new Date()
    });

    log.save();
}

function saveAccountUpdateLog(userEmail) {
    var log = new AccountLog({
        email: userEmail,
        updatedAt: new Date()
    });

    log.save();
}

function saveSignInLog(userEmail) {
    var log = new AccountLog({
        email: userEmail,
        signedIn: new Date()
    });

    log.save();
}

function saveSignOutLog(userEmail) {
    var log = new AccountLog({
        email: userEmail,
        signedOut: new Date()
    });

    log.save();
}

function saveSignUpLog(userEmail) {
    var log = new AccountLog({
        email: userEmail,
        createdAt: new Date()
    });

    log.save();
}

function saveUnlinkLog(userEmail) {
    var log = new AccountLog({
        email: userEmail,
        unlinkedAt: new Date()
    });

    log.save();
}

function saveAccountRemoveLog(userEmail) {
    var log = new AccountLog({
        email: userEmail,
        removedAt: new Date()
    });

    log.save();
}

function getToday() {
    return new Date().toISOString().slice(0, 10);
}

function getHarooID() {
    return (getToday().toString()).replace(/-/g,'') + '-' + uid.generate();
}

function getAccessToken() {
//    return uuid.v1();
    return uuid.v4();
}

function getExpireDate() {
    return Date.now() + ( 15 * DAY );
}

function setAccountToClient(codeStub, userData) {
    var result = codeStub;
    result.email = userData.email;
    result.harooID = userData.harooID;
    result.loginExpire = userData.loginExpire;
    result.profile = userData.profile;
    if (userData.accessToken) {
        result.accessToken = userData.accessToken;
    }
    if (userData.provider) {
        result.provider = userData.provider;
        result.tokens = userData.tokens;
    }

    return result;
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
    setAccountToClient: setAccountToClient
};