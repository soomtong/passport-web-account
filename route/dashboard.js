var database = require('../config/database');
var async = require('async');

var nano = require('nano')(database.couch.url);

exports.index = function (req, res) {
    var params = {
        user_id: req.user.uid,
        list: []
    };
    var couch = nano.db.use('db1');

    couch.view('total_list', 'list', function (err, body) {
        if (!err) {
            body.rows.forEach(function (doc) {
                console.log(doc.value);
            });
        } else {
            console.log(err);
        }
    });
    res.render('dashboard', params);

/*
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
*/
};

exports.documentView = function (req, res) {
    var params = {
        user_id: req.user.uid,
        view_id: req.param('view_id')
    };

    var couch = nano.db.use('db1');

    couch.get(params.view_id, function (err, doc) {
        console.log(doc);
        params.doc = doc;
        if (!err) {
            res.render('document_view', params);
        } else {
            res.status(500).send('Something broke!');
        }
    });
};

exports.documentPublicView = function (req, res) {
    var params = {
        view_id: req.param('view_id')
    };

    var couch = nano.db.use('db1');

    couch.get(params.view_id, function (err, doc) {
        params.doc = doc;
        if (!err) {
            res.render('document_public_view', params);
        } else {
            res.status(500).send('Something broke!');
        }
    });
};