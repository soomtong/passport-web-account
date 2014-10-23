var CouchServerConnector = require('init-user');
var database = require('../config/database');

exports.initAccount = function (haroo_id) {
    var InitUser = new CouchServerConnector(database.couch.host, database.couch.port, database.couch.id, database.couch.pass);
    InitUser.createNewAccount(haroo_id, function (err, res) {
        if (err) {
            throw new Error('fail');
        }
        //console.log(res);
    });
};