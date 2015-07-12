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

//validateUser only called for POST and PUT
function validateUser(req, res, next) {
    if (req.body && (isEmpty(req.body) && req.method === "POST")) {
        next();
        return;
    }
    if (!req.body || (req.body && !req.body._data)) {
        next(new restify.InvalidContentError('Missing content for ' + req.url.pathname));
        return;
    }

    var user = req.body._data;
    var valid = user._name &&
                user._accessProfile &&
                user._accessProfile._name &&
                user._accessProfile._href;
    if (!valid) {
        next(new restify.InvalidContentError('Invalid or missing attributes for ' + req.url.pathname));
        return;
    }
    next();
}

function createUser(req, res, next) {
    var newId = req.url.pathname + '/' + shortId.generate();
    var company = /\/[^\/]+/.exec(req.url.pathname)[0];
    var user = {
        _id: newId,
        _company: company,
        _data: {}
    };
    if (req.body && isEmpty(req.body)) {
        user._status = "empty";
        user._lastModifiedDate = (new Date()).toJSON();
    } else {
        user._data = req.body._data;
        user._status = 'active';
        user._lastModifiedDate = (new Date()).toJSON();
        user._links = {
            _self: newId,
            _company: company,
            _profiles: company + '/profiles'
        };
    }

    req.db.create('users', newId, user, function (err) {
        if (err) {
            req.log.warn(err, 'createUser: unable to create ', newId);
            next(err);
            return;
        }
        res.setHeader('Location', newId);
        //res.setHeader('Content-Length', Buffer.byteLength(user));
        res.send(201, user);
        req.log.debug({path: newId}, 'createUser: done');
        next();
    });
}

function listUsers(req, res, next) {
    var userList = {
        _data: [],
        _links: {
            _self: req.url.pathname
        }
    };

    function project (usr) {
        userList._data.push({
            _id: usr._id,
            _name: usr._data._name,
        });
    }
    
    var qstring = querystring.stringify(req.query);
    if (qstring !== '') {
        userList._links._self = userList._links._self + '?' + qstring;
        if (req.query.name) {
            req.query['_data._name'] = req.query.name;
            delete req.query.name;
        }
    }
    
    req.db.list('users', req.query, function (err, data) {
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + 'was not found'));
            return;
        }
        if (err && err !== '404') {
            req.log.warn(err, 'listUsers: unable to list ', req.url.pathname);
            next(err);
            return;
        }
        data.forEach(project);
        res.setHeader('Content-Length', Buffer.byteLength(userList));
        res.send(200, userList);
        req.log.debug({path: req.url.pathname}, 'listUsers: done');
        next();
    });
}

function getUser(req, res, next) {

    req.db.read('users', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'getUser: unable to read ', req.url.pathname);
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
        var user = {
            _id: data._id,
            _company: data._company,
            _data: data._data,
            _status: data._status,
            _lastModifiedDate: data._lastModifiedDate,
            _links: data._links,
        };
        res.send(200, user);
        req.log.debug({path: req.url.pathname}, 'getUser: done');
        next();
    });
}

function putUser(req, res, next) {

    req.db.read('users', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'getUser: unable to read ', req.url.pathname);
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
        var user = {
            _id: req.url.pathname,
            _company: company,
            _data: req.body._data,
            _status: 'active',
            _lastModifiedDate: (new Date()).toJSON(),
            _links: data._links
        };

        req.db.update('users', req.url.pathname, user, function (err) {
            if (err && err !== '404') {
                req.log.warn(err, 'putUser: unable to save ', req.url.pathname);
                next(err);
                return;
            }
            if (err && err === '404') {
                next(new restify.NotFoundError(req.url.pathname + ' was not found'));
                return;
            }
            //res.setHeader('Content-Length', Buffer.byteLength(user));
            res.send(200, user);
            req.log.debug({path: req.url.pathname}, 'putUser: done');
            next();
        });
    });
}

function deleteUser(req, res, next) {
    req.db.read('users', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'deleteUser: unable to read ', req.url.pathname);
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
        var user = data;
        user._status = 'deleted';
        user._lastModifiedDate = (new Date()).toJSON();
        req.db.update('users', req.url.pathname, user, function (err) {
            if (err) {
                req.log.warn(err, 'deleteUser: unable to update ', req.url.pathname);
                next(err);
                return;
            }
            res.send(204);
            req.log.debug({path: req.url.pathname}, 'deleteUser: done');
            next();
        });
    });
}

module.exports = {
    validateUser: validateUser,
    createUser: createUser,
    listUsers: listUsers,
    getUser: getUser,
    putUser: putUser,
    deleteUser: deleteUser
};

