// Copyright (c) 2015 Pedro Vieira.

var assert = require('assert-plus');
var bunyan = require('bunyan');
var restify = require('restify');
var parseUrl = require('url');
var shortId = require('shortid');


function validateCompany(req, res, next) {
    if ((req.params === {} || req.params._data === {}) && req.method === "POST") {
        next();
        return:
    }
    if (!req.params._data) {
        next(new restify.InvalidContentError('Missing content for ' + req.url.pathname));
        return;
    }

    var company = req.params._data;
    var valid = company._taxNumber &&
                company._country &&
                company._currency &&
                company._description &&
                company._addresses;
    if (!valid) {
        next(new restify.InvalidContentError('Invalid or missing attributes for ' + req.url.pathname));
        return;
    };
    next();
}

function createCompany(req, res, next) {
    var newId = req.url.pathname + shortId.generate();
/*    var path = ;
    if (path === '/') {
        path = path + newId;
    } else {
        path = path + '/' + newId;
    };
*/
    var company = {
        _id: newId,
        _data: {}
    };

    if (req.params === {} || req.params._data === {}) {
        company._status = "empty";
    } else {
        company._data = req.params._data;
        company._status = 'active';
        company._lastModifiedDate = (new Date()).toJSON();
        company._links = {
            _self: newId,
            _company: newId,
            _documents: newId + '/documents',
            _settings: newId + '/settings'
        }
    };

    req.db.create(req.dir, newId, company, function (err) {
        if (err) {
            req.log.warn(err, 'createCompany: unable to create ', newId);
            next(err);
            return;
        };
        res.setHeader('Location', newId);
        //res.setHeader('Content-Length', Buffer.byteLength(company));
        res.send(201, company);
//        req.log.debug({path: newId}, 'createCompany: done');
        next();
    });
}

function listCompanies(req, res, next) {
    var companyList = {
        _data: [],
        _links: {
            _self: req.url.pathname
        }
    };

    function formatList (item) {
        companyList._data.push({
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
            req.log.warn(err, 'listCompanies: unable to list ', req.url.pathname);
            next(err);
            return;
        };
        data.forEach(formatList);
        res.setHeader('Content-Length', Buffer.byteLength(companyList));
        res.send(200, companyList);
//        req.log.debug({path: req.url.pathname}, 'listCompany: done');
        next();
    });
}

function getCompany(req, res, next) {
    req.db.read(req.dir, req.url.pathname, function (err, data) {
        if (err && err !== '404') {
            req.log.warn(err, 'getCompany: unable to read ', req.url.pathname);
            next(err);
            return;
        };
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + ' was not found'));
            return;
        };
        var company = {
            _id: data._id,
            _data: data._data,
            _status: data._status,
            _lastModifiedDate: data._lastModifiedDate,
            _links: data._links,
        }
        res.send(200, company);
//        req.log.debug({path: req.url.pathname}, 'getCompany: done');
        next();
    });
}

function putCompany(req, res, next) {
    var company = {
        _id: req.url.pathname,
        _data: req.params._data,
        _status: 'active',
        _lastModifiedDate: (new Date()).toJSON(),
        _links: {
            _self: req.url.pathname,
            _company: req.url.pathname,
            _documents: req.url.pathname + '/documents',
            _settings: req.url.pathname + '/settings'
        }
    };

    req.db.update(req.dir, req.url.pathname, company, function (err) {
        if (err && err !== '404') {
            req.log.warn(err, 'putCompany: unable to save ', req.url.pathname);
            next(err);
            return;
        };
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + ' was not found'));
            return;
        };
//        res.setHeader('Content-Length', Buffer.byteLength(company));
        res.send(200, company);
//        req.log.debug({path: req.url.pathname}, 'putCompany: done');
        next();
    });
}

function deleteCompany(req, res, next) {
    req.db.read(req.dir, req.url.pathname, function (err, data) {
        if (err && err !== '404') {
            req.log.warn(err, 'deleteCompany: unable to read ', req.url.pathname);
            next(err);
            return;
        };
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + ' was not found'));
            return;
        };
        var company = data;
        company._status = 'deleted';
        company._lastModifiedDate = (new Date()).toJSON();
        req.db.update(req.dir, req.url.pathname, company, function (err) {
            if (err) {
                req.log.warn(err, 'deleteCompany: unable to update ', req.url.pathname);
                next(err);
                return;
            };
            req.db.remove(req.dir, req.url.pathname, function (err) {
                if (err) {
                    req.log.warn(err, 'deleteCompany: unable to remove ', req.url.pathname);
                    next(err);
                    return;
                };
                res.send(204);
//                req.log.debug({path: req.url.pathname}, 'deleteCompany: done');
                next();
            });
        });
    });
}

module.exports = {
    validateCompany: validateCompany,
    createCompany: createCompany,
    listCompanies: listCompanies,
    getCompany: getCompany,
    putCompany: putCompany,
    deleteCompany: deleteCompany
};

