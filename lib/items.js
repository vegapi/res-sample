// Copyright (c) 2015 Pedro Vieira.

//var assert = require('assert-plus');
//var bunyan = require('bunyan');
var restify = require('restify');
var parseUrl = require('url');
var shortId = require('shortid');
var querystring = require('querystring');

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

//validateItem only called for POST and PUT
function validateItem(req, res, next) {
    if (req.body && (isEmpty(req.body) && req.method === "POST")) {
        next();
        return;
    }
    if (!req.body || (req.body && !req.body._data)) {
        next(new restify.InvalidContentError('Missing content for ' + req.url.pathname));
        return;
    }

    var itm = req.body._data;
    var valid = itm._name &&
                itm._description &&
                itm._itemType &&
                itm._vatRate;

    if (!valid) {
        next(new restify.InvalidContentError('Invalid or missing attributes for ' + req.url.pathname));
        return;
    }
    next();
}

function createItem(req, res, next) {
    var newId = req.url.pathname + '/' + shortId.generate();
    var company = /\/[^\/]+/.exec(req.url.pathname)[0];
    var itm = {
        _id: newId,
        _data: {}
    };
    if (req.body && isEmpty(req.body)) {
        itm._status = "empty";
        itm._lastModifiedDate = (new Date()).toJSON();
    } else {
        itm._data = req.body._data;
        itm._status = 'active';
        itm._lastModifiedDate = (new Date()).toJSON();
        itm._links = {
            _self: newId,
            _company: company,
            _documents: company + '/documents?item="' + newId + '"'
        };
    }

    req.db.create('items', newId, itm, function (err) {
        if (err) {
            req.log.warn(err, 'createItem: unable to create ', newId);
            next(err);
            return;
        }
        res.setHeader('Location', newId);
        //res.setHeader('Content-Length', Buffer.byteLength(itm));
        res.send(201, itm);
        req.log.debug({path: newId}, 'createItem: done');
        next();
    });
}

function listItems(req, res, next) {
    var itmList = {
        _data: [],
        _links: {
            _self: req.url.pathname
        }
    };

    function project (itm) {
        itmList._data.push({
            _id: itm._id,
            _name: itm._data._name,
        });
    }
    
    var qstring = querystring.stringify(req.query);
    if (qstring !== '') {
        itmList._links._self = itmList._links._self + '?' + qstring;
        if (req.query.name) {
            req.query['_data._name'] = req.query.name;
            delete req.query.name;
        }
        if (req.query.tag) {
            req.query['_data._tags'] = req.query.tag;
            delete req.query.tag;
        }
    }
    
    req.db.list('items', req.query, function (err, data) {
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + 'was not found'));
            return;
        }
        if (err && err !== '404') {
            req.log.warn(err, 'listItems: unable to list ', req.url.pathname);
            next(err);
            return;
        }
        data.forEach(project);
        res.setHeader('Content-Length', Buffer.byteLength(itmList));
        res.send(200, itmList);
        req.log.debug({path: req.url.pathname}, 'listItems: done');
        next();
    });
}

function getItem(req, res, next) {

    req.db.read('items', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'getItem: unable to read ', req.url.pathname);
            next(err);
            return;
        }
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + ' was not found'));
            return;
        }
        if (err && err === '410') {
            next(new restify.GoneError(req.url.pathname + ' no longer exists'));
            return;
        }
        var itm = {
            _id: data._id,
            _data: data._data,
            _status: data._status,
            _lastModifiedDate: data._lastModifiedDate,
            _links: data._links,
        };
        res.send(200, itm);
        req.log.debug({path: req.url.pathname}, 'getItem: done');
        next();
    });
}

function putItem(req, res, next) {

    req.db.read('items', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'getItem: unable to read ', req.url.pathname);
            next(err);
            return;
        }
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + ' was not found'));
            return;
        }
        if (err && err === '410') {
            next(new restify.GoneError(req.url.pathname + ' no longer exists'));
            return;
        }

        var company = /\/[^\/]+/.exec(req.url.pathname)[0];
        var itm = {
            _id: req.url.pathname,
            _data: req.body._data,
            _status: 'active',
            _lastModifiedDate: (new Date()).toJSON(),
            _links: data._links
        };

        req.db.update('items', req.url.pathname, itm, function (err) {
            if (err && err !== '404') {
                req.log.warn(err, 'putItem: unable to save ', req.url.pathname);
                next(err);
                return;
            }
            if (err && err === '404') {
                next(new restify.NotFoundError(req.url.pathname + ' was not found'));
                return;
            }
            //res.setHeader('Content-Length', Buffer.byteLength(itm));
            res.send(200, itm);
            req.log.debug({path: req.url.pathname}, 'putItem: done');
            next();
        });
    });
}

function deleteItem(req, res, next) {
    req.db.read('items', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'deleteItem: unable to read ', req.url.pathname);
            next(err);
            return;
        }
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + ' was not found'));
            return;
        }
        if (err && err === '410') {
            next(new restify.GoneError(req.url.pathname + ' no longer exists'));
            return;
        }
        var itm = data;
        itm._status = 'deleted';
        itm._lastModifiedDate = (new Date()).toJSON();
        req.db.update('items', req.url.pathname, itm, function (err) {
            if (err) {
                req.log.warn(err, 'deleteItem: unable to update ', req.url.pathname);
                next(err);
                return;
            }
            res.send(204);
            req.log.debug({path: req.url.pathname}, 'deleteItem: done');
            next();
        });
    });
}

module.exports = {
    validateItem: validateItem,
    createItem: createItem,
    listItems: listItems,
    getItem: getItem,
    putItem: putItem,
    deleteItem: deleteItem
};

