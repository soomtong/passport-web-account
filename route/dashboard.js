var database = require('../config/database');
var async = require('async');

var nano = require('nano')(database.couch.url);

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

    couch.view('dashboard', 'total_list', function (err, result) {
        if (!err) {
            result.rows.forEach(function (doc) {
                console.log(doc.key, doc.value);
            });
            params.list = result.rows;
            params.page_param = getPageParams(Number(result.rows.length), Number(params.page), Number(params.pageSize), Number(params.pageGutter));

            res.render('dashboard', params);
        } else {
            console.log(err);
            res.render('dashboard', params);
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