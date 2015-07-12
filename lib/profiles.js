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

//validateProfile only called for POST and PUT
function validateProfile(req, res, next) {
    if (req.body && (isEmpty(req.body) && req.method === "POST")) {
        next();
        return;
    }
    if (!req.body || (req.body && !req.body._data)) {
        next(new restify.InvalidContentError('Missing content for ' + req.url.pathname));
        return;
    }

    var profile = req.body._data;
    var valid = profile._name &&
                profile._resourceAccess;
    if (!valid) {
        next(new restify.InvalidContentError('Invalid or missing attributes for ' + req.url.pathname));
        return;
    }
    next();
}

function createProfile(req, res, next) {
    var newId = req.url.pathname + '/' + shortId.generate();
    var company = /\/[^\/]+/.exec(req.url.pathname)[0];
    var profile = {
        _id: newId,
        _company: company,
        _data: {}
    };
    if (req.body && isEmpty(req.body)) {
        profile._status = "empty";
        profile._lastModifiedDate = (new Date()).toJSON();
    } else {
        profile._data = req.body._data;
        profile._status = 'active';
        profile._lastModifiedDate = (new Date()).toJSON();
        profile._links = {
            _self: newId,
            _company: company,
            _users: company + '/users'
        };
    }

    req.db.create('profiles', newId, profile, function (err) {
        if (err) {
            req.log.warn(err, 'createProfile: unable to create ', newId);
            next(err);
            return;
        }
        res.setHeader('Location', newId);
        //res.setHeader('Content-Length', Buffer.byteLength(profile));
        res.send(201, profile);
        req.log.debug({path: newId}, 'createProfile: done');
        next();
    });
}

function listProfiles(req, res, next) {
    var profileList = {
        _data: [],
        _links: {
            _self: req.url.pathname
        }
    };

    function project (usr) {
        profileList._data.push({
            _id: usr._id,
            _name: usr._data._name,
        });
    }
    
    var qstring = querystring.stringify(req.query);
    if (qstring !== '') {
        profileList._links._self = profileList._links._self + '?' + qstring;
        if (req.query.name) {
            req.query['_data._name'] = req.query.name;
            delete req.query.name;
        }
    }
    
    req.db.list('profiles', req.query, function (err, data) {
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + 'was not found'));
            return;
        }
        if (err && err !== '404') {
            req.log.warn(err, 'listProfiles: unable to list ', req.url.pathname);
            next(err);
            return;
        }
        data.forEach(project);
        res.setHeader('Content-Length', Buffer.byteLength(profileList));
        res.send(200, profileList);
        req.log.debug({path: req.url.pathname}, 'listProfiles: done');
        next();
    });
}

function getProfile(req, res, next) {

    req.db.read('profiles', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'getProfile: unable to read ', req.url.pathname);
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
        var profile = {
            _id: data._id,
            _company: data._company,
            _data: data._data,
            _status: data._status,
            _lastModifiedDate: data._lastModifiedDate,
            _links: data._links,
        };
        res.send(200, profile);
        req.log.debug({path: req.url.pathname}, 'getProfile: done');
        next();
    });
}

function putProfile(req, res, next) {

    req.db.read('profiles', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'getProfile: unable to read ', req.url.pathname);
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
        var profile = {
            _id: req.url.pathname,
            _company: company,
            _data: req.body._data,
            _status: 'active',
            _lastModifiedDate: (new Date()).toJSON(),
            _links: data._links
        };

        req.db.update('profiles', req.url.pathname, profile, function (err) {
            if (err && err !== '404') {
                req.log.warn(err, 'putProfile: unable to save ', req.url.pathname);
                next(err);
                return;
            }
            if (err && err === '404') {
                next(new restify.NotFoundError(req.url.pathname + ' was not found'));
                return;
            }
            //res.setHeader('Content-Length', Buffer.byteLength(profile));
            res.send(200, profile);
            req.log.debug({path: req.url.pathname}, 'putProfile: done');
            next();
        });
    });
}

function deleteProfile(req, res, next) {
    req.db.read('profiles', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'deleteProfile: unable to read ', req.url.pathname);
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
        var profile = data;
        profile._status = 'deleted';
        profile._lastModifiedDate = (new Date()).toJSON();
        req.db.update('profiles', req.url.pathname, profile, function (err) {
            if (err) {
                req.log.warn(err, 'deleteProfile: unable to update ', req.url.pathname);
                next(err);
                return;
            }
            res.send(204);
            req.log.debug({path: req.url.pathname}, 'deleteProfile: done');
            next();
        });
    });
}

module.exports = {
    validateProfile: validateProfile,
    createProfile: createProfile,
    listProfiles: listProfiles,
    getProfile: getProfile,
    putProfile: putProfile,
    deleteProfile: deleteProfile
};

