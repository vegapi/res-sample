// Copyright (c) 2015 Pedro Vieira.

var assert = require('assert-plus');
var bunyan = require('bunyan');
var restify = require('restify');
var parseUrl = require('url');
var shortId = require('shortid');


function validateDocument(req, res, next) {
    if ((req.params === {} || req.params._data === {}) && req.method === "POST") {
        next();
        return:
    }
    if (!req.params._data) {
        next(new restify.InvalidContentError('Missing content for ' + req.url.pathname));
        return;
    }

    var doc = req.params._data;
    var valid = doc._documentType &&
                doc._date &&
                doc._currency &&
                doc._description &&
                doc._entity &&
                doc._netAmount &&
                doc._items; // &&
//                doc._items._itemType &&
//                doc._items._netAmount &&
//                doc._items._vatRate &&
//                doc._items._vatAmount;
    if (!valid) {
        next(new restify.InvalidContentError('Invalid or missing attributes for ' + req.url.pathname));
        return;
    };
    next();
}

function createDocument(req, res, next) {
    var newId = req.url.pathname + '/' + shortId.generate();
    var company = /\/[^\/]+/.exec(req.url.pathname)[0];
    var doc = {
        _id: newId,
        _data = {}
    };
    if (req.params === {} || req.params._data === {}) {
        doc._status = "empty";
    } else {
        doc._data = req.params._data;
        doc._status = 'active';
        doc._lastModifiedDate = (new Date()).toJSON();
        doc._links = {
            _self: newId,
            _company: company,
            _documents: company + '/documents',
            _settings: company + '/settings'
        }
    };

    req.db.create(req.dir, newId, doc, function (err) {
        if (err) {
            req.log.warn(err, 'createDocument: unable to create ', newId);
            next(err);
            return;
        };
        //res.setHeader('Content-Length', Buffer.byteLength(doc));
        res.setHeader('Location', newId);
        res.send(201, doc);
//        req.log.debug({path: newId}, 'createDocument: done');
        next();
    });
}

function listDocuments(req, res, next) {
    var docList = {
        _data: [],
        _links: {
            _self: req.url.pathname
        }
    };

    function formatList (item) {
        docList._data.push({
            _name: item[0]._data._name,
            _id: item[1]
        })
    };
    
    req.db.list(req.dir, req.url.pathname, function (err, data) {
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + 'was not found'));
            return;
        };
        if (err && err !== '404') {
            req.log.warn(err, 'listDocument: unable to list ', req.url.pathname);
            next(err);
            return;
        };
        data.forEach(formatList);
        res.setHeader('Content-Length', Buffer.byteLength(docList));
//        req.log.debug({path: req.url.pathname}, 'listDocument: done');
        res.send(200, docList);
        next();
    });
}

function getDocument(req, res, next) {
    req.db.read(req.dir, req.url.pathname, function (err, data) {
        if (err && err !== '404') {
            req.log.warn(err, 'getDocument: unable to read ', req.url.pathname);
            next(err);
            return;
        };
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + ' was not found'));
            return;
        };
        var doc = {
            _id: data._id,
            _data: data._data,
            _status: data._status,
            _lastModifiedDate: data._lastModifiedDate,
            _links: data._links,
        }
        res.send(200, doc);
//        req.log.debug({path: req.url.pathname}, 'getDocument: done');
        next();
    });
}

function putDocument(req, res, next) {
    var company = /\/[^\/]+/.exec(req.url.pathname)[0];
    var doc = {
        _id: req.url.pathname,
        _data: req.params._data,
        _status: 'active',
        _lastModifiedDate: (new Date()).toJSON(),
        _links: {
            _self: req.url.pathname,
            _company: company,
            _documents: company + '/documents',
            _settings: company + '/settings'
        }
    };

    req.db.update(req.dir, req.url.pathname, doc, function (err) {
        if (err && err !== '404') {
            req.log.warn(err, 'putDocument: unable to save ', req.url.pathname);
            next(err);
            return;
        };
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + ' was not found'));
            return;
        };
//        res.setHeader('Content-Length', Buffer.byteLength(doc));
        res.send(200, doc);
//        req.log.debug({path: req.url.pathname}, 'putDocument: done');
        next();
    });
}

function deleteDocument(req, res, next) {
    req.db.read(req.dir, req.url.pathname, function (err, data) {
        if (err && err !== '404') {
            req.log.warn(err, 'deleteDocument: unable to read ', req.url.pathname);
            next(err);
            return;
        };
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + ' was not found'));
            return;
        };
        var doc = data;
        doc._status = 'deleted';
        doc._lastModifiedDate = (new Date()).toJSON();
        req.db.update(req.dir, req.url.pathname, doc, function (err) {
            if (err) {
                req.log.warn(err, 'deleteDocument: unable to update ', req.url.pathname);
                next(err);
                return;
            };
            req.db.remove(req.dir, req.url.pathname, function (err) {
                if (err) {
                    req.log.warn(err, 'deleteDocument: unable to remove ', req.url.pathname);
                    next(err);
                    return;
                };
                res.send(204);
//                req.log.debug({path: req.url.pathname}, 'deleteDocument: done');
                next();
            });
        });
    });
}

module.exports = {
    validateDocument: validateDocument,
    createDocument: createDocument,
    listDocuments: listDocuments,
    getDocument: getDocument,
    putDocument: putDocument,
    deleteDocument: deleteDocument
};

