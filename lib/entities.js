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

//validateEntity only called for POST and PUT
function validateEntity(req, res, next) {
    if (req.body && (isEmpty(req.body) && req.method === "POST")) {
        next();
        return;
    }
    if (!req.body || (req.body && !req.body._data)) {
        next(new restify.InvalidContentError('Missing content for ' + req.url.pathname));
        return;
    }

    var ent = req.body._data;
    var valid = ent._name &&
                ent._taxNumber &&
                ent._currency &&
                ent._description &&
                ent._address &&
                ent._address._main &&
                ent._country;

    if (!valid) {
        next(new restify.InvalidContentError('Invalid or missing attributes for ' + req.url.pathname));
        return;
    }
    next();
}

function createEntity(req, res, next) {
    var newId = req.url.pathname + '/' + shortId.generate();
    var company = /\/[^\/]+/.exec(req.url.pathname)[0];
    var ent = {
        _id: newId,
        _data: {}
    };
    if (req.body && isEmpty(req.body)) {
        ent._status = "empty";
        ent._lastModifiedDate = (new Date()).toJSON();
    } else {
        ent._data = req.body._data;
        ent._status = 'active';
        ent._lastModifiedDate = (new Date()).toJSON();
        ent._links = {
            _self: newId,
            _company: company,
            _documents: company + '/documents?entity="' + newId + '"',
            _payments: company + '/payments?entity="' + newId + '"'
        };
    }

    req.db.create('entities', newId, ent, function (err) {
        if (err) {
            req.log.warn(err, 'createEntity: unable to create ', newId);
            next(err);
            return;
        }
        res.setHeader('Location', newId);
        //res.setHeader('Content-Length', Buffer.byteLength(ent));
        res.send(201, ent);
        req.log.debug({path: newId}, 'createEntity: done');
        next();
    });
}

function listEntities(req, res, next) {
    var entList = {
        _data: [],
        _links: {
            _self: req.url.pathname
        }
    };

    function project (ent) {
        entList._data.push({
            _id: ent._id,
            _name: ent._data._name,
        });
    }
    
    var qstring = querystring.stringify(req.query);
    if (qstring !== '') {
        entList._links._self = entList._links._self + '?' + qstring;
        if (req.query.name) {
            req.query['_data._name'] = req.query.name;
            delete req.query.name;
        }
        if (req.query.tag) {
            req.query['_data._tags'] = req.query.tag;
            delete req.query.tag;
        }
    }
    
    req.db.list('entities', req.query, function (err, data) {
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + 'was not found'));
            return;
        }
        if (err && err !== '404') {
            req.log.warn(err, 'listEntities: unable to list ', req.url.pathname);
            next(err);
            return;
        }
        data.forEach(project);
        res.setHeader('Content-Length', Buffer.byteLength(entList));
        res.send(200, entList);
        req.log.debug({path: req.url.pathname}, 'listEntities: done');
        next();
    });
}

function getEntity(req, res, next) {

    req.db.read('entities', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'getEntity: unable to read ', req.url.pathname);
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
        var ent = {
            _id: data._id,
            _data: data._data,
            _status: data._status,
            _lastModifiedDate: data._lastModifiedDate,
            _links: data._links,
        };
        res.send(200, ent);
        req.log.debug({path: req.url.pathname}, 'getEntity: done');
        next();
    });
}

function putEntity(req, res, next) {

    req.db.read('entities', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'getEntity: unable to read ', req.url.pathname);
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
        var ent = {
            _id: req.url.pathname,
            _data: req.body._data,
            _status: 'active',
            _lastModifiedDate: (new Date()).toJSON(),
            _links: data._links
        };

        req.db.update('entities', req.url.pathname, ent, function (err) {
            if (err && err !== '404') {
                req.log.warn(err, 'putEntity: unable to save ', req.url.pathname);
                next(err);
                return;
            }
            if (err && err === '404') {
                next(new restify.NotFoundError(req.url.pathname + ' was not found'));
                return;
            }
            //res.setHeader('Content-Length', Buffer.byteLength(ent));
            res.send(200, ent);
            req.log.debug({path: req.url.pathname}, 'putEntity: done');
            next();
        });
    });
}

function deleteEntity(req, res, next) {
    req.db.read('entities', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'deleteEntity: unable to read ', req.url.pathname);
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
        var ent = data;
        ent._status = 'deleted';
        ent._lastModifiedDate = (new Date()).toJSON();
        req.db.update('entities', req.url.pathname, ent, function (err) {
            if (err) {
                req.log.warn(err, 'deleteEntity: unable to update ', req.url.pathname);
                next(err);
                return;
            }
            res.send(204);
            req.log.debug({path: req.url.pathname}, 'deleteEntity: done');
            next();
        });
    });
}

module.exports = {
    validateEntity: validateEntity,
    createEntity: createEntity,
    listEntities: listEntities,
    getEntity: getEntity,
    putEntity: putEntity,
    deleteEntity: deleteEntity
};

