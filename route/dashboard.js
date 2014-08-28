var database = require('../config/database');
var async = require('async');

var nano = require('nano')(database.couch.url);

exports.index = function (req, res) {
    var params = {
        id: req.user.uid,
        list: []
    };
    var couch = nano.db.use('db1');

    async.waterfall([
        function (callback) {
            couch.list(function (err, result) {
                if (!err) {
                    callback(err, result);
                }
            })
        },
        function (list, callback) {
            var titles = [];
            async.eachSeries(list.rows, function (item, next) {
                    couch.get(item.key, { revs_info: false }, function (err, doc) {
                        if (err) {
                            next(err);
                        } else {
                            titles.push(doc.title);
                            next();
                        }
                    });
                },
                function (err) {
                    callback(err, titles);
                });
        }
    ], function (err, result) {
        params.list = result;
        res.render('dashboard', params);
    });
};
