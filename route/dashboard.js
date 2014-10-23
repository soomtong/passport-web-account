var database = require('../config/database');
var async = require('async');

var nano = require('nano')('http://' + database.couch.host);

function getPageParams (totalCount, nowPage, pageSize, pageGutter) {
    var params = {};

    params.totalCount = totalCount;
    params.lineCounter = totalCount - ( pageSize * (nowPage - 1));
    params.totalPages = parseInt(totalCount / pageSize) + (totalCount % pageSize ? 1 : 0);

    params.startPage = params.totalPages > pageGutter * 2 && nowPage - pageGutter > 0 ? nowPage - pageGutter - (pageGutter + nowPage - params.totalPages > 0 ? pageGutter + nowPage - params.totalPages : 0) : 1;
    params.endPage = params.totalPages > pageGutter * 2 && nowPage + pageGutter < params.totalPages ? nowPage + pageGutter + (pageGutter - nowPage > 0 ? pageGutter - nowPage : 0) : params.totalPages;

    return params;
}

exports.index = function (req, res) {
    var params = {
        user_id: req.user.uid,
        list: [],
        page: req.param('p') || 1,
        pageSize: 20,
        pageGutter: 10
    };
    var couch = nano.db.use('db1');

    async.parallel([
            function (callback) {
                couch.view('dashboard', 'recent_list', function (err, result) {
                    if (!err) {
                        callback(null, result.rows);
                    } else {
                        callback(err);
                    }
                });
            },
            function (callback) {
                couch.view('dashboard', 'tag_count', function (err, result) {
                    if (!err) {
                        callback(null, result.rows[0]);
                    } else {
                        callback(err);
                    }
                });
            }],
        function (err, results) {
            params.list = results[0];
            params.page_param = getPageParams(Number(results[0].length), Number(params.page), Number(params.pageSize), Number(params.pageGutter));

            params.tagCount = results[1].value;

            res.render('dashboard', params);
        });
};

exports.list = function (req, res) {
    var params = {
        type: req.param('t'),
        user_id: req.user.uid,
        list: [],
        page: req.param('p') || 1,
        pageSize: 20,
        pageGutter: 10
    };

    var couch = nano.db.use('db1');
    var listType = (params.type || 'total') + '_list';

    couch.view('dashboard', listType, function (err, result) {
        if (!err) {
//            result.rows.forEach(function (doc) {
//                console.log(doc.key, doc.value);
//            });
            params.list = result.rows;
            params.page_param = getPageParams(Number(result.rows.length), Number(params.page), Number(params.pageSize), Number(params.pageGutter));

            res.render('dashboard_list', params);
        } else {
            console.log(err);
            res.render('dashboard_list', params);
        }
    });
};

exports.documentView = function (req, res) {
    var params = {
        user_id: req.user.uid,
        view_id: req.param('view_id')
    };

    var couch = nano.db.use('db1');

    couch.get(params.view_id, function (err, doc) {
        params.doc = doc;
        if (!err) {
            res.render('document_view', params);
        } else {
            res.status(500).send('Something broke!');
        }
    });
};

exports.documentUpdate = function (req, res) {
    var params = {
        user_id: req.user.uid,
        view_id: req.param('view_id'),
        publicUrl: req.param('publicUrl') || ''
    };

    if (!params.view_id) return res.send({ ok: false });

    var couch = nano.db.use('db1');

    couch.get(params.view_id, function (err, doc) {
        if (err) {
            console.log(err);
            return res.send({ ok: false });
        } else {
            var meta = doc.meta || {};
            meta.share = meta.share ? null : params.publicUrl;
            doc.meta = meta;

            couch.insert(doc, params.view_id, function (err, body) {
                    if (!err) {
                        console.log(body);
                    } else {
                        console.log(err);
                    }

                    res.send(body);
                }
            );
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