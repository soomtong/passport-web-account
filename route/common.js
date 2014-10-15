/**
 * Created by soomtong on 2014. 10. 15..
 */
var uid = require('shortid');

var HOUR = 3600000;
var DAY = HOUR * 24;

function getToday() {
    return new Date().toISOString().slice(0, 10);
}

function getHarooID() {
    return getToday().toString() + '_' + uid.generate();
}

function getExpireDate() {
    return new Date(Date.now() + ( 50 * DAY ));
}


module.exports = {
    getToday: getToday,
    getHarooID: getHarooID,
    getLoginExpireDate: getExpireDate
};