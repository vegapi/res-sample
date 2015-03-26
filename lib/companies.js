// Copyright (c) 2015 Pedro Vieira.

var assert = require('assert-plus');
var bunyan = require('bunyan');
var restify = require('restify');
var errors = require('./errors');
var parseUrl = require('url');
var db = require('./somedb');
var shortId = require('shortid');


function validateCompany(req, res, next) {
    if (!req.params._data) {
        req.log.warn({params: req.params}, 'validateCompany: missing content');
        next(new errors.MissingContentError());
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
    var newId = shortId.generate();
    var path = req.url.pathname;
    if (path === '/') {
        path = path + newId;
    } else {
        path = path + '/' + newId;
    };
    var company = {
        _id: path,
        _data: req.params._data,
        _status: 'active',
        _lastModified: (new Date()).toJSON(),
        _links: {
            _self: path,
            _documents: path + '/documents',
            _settings: path + '/settings'
        }
    };

    db.create(req.dir, path, company, function (err) {
        if (err) {
            req.log.warn(err, 'createCompany: unable to create');
            next(err);
            return;
        };
        req.log.debug({company: company}, 'createCompany: done');
        res.setHeader('Location', path);
        //res.setHeader('Content-Length', Buffer.byteLength(company));
        res.send(201, company);
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
    db.list(req.dir, req.url.pathname, function (err, data) {
        if (err && err === '404') {
            next(new errors.NotFoundError());
            return;
        };
        if (err && err !== '404') {
            req.log.warn(err, 'listCompanies: unable to list');
            next(err);
            return;
        };
        req.log.debug({data: data}, 'list data received');
        companyList._data = data;
//        res.setHeader('Content-Length', Buffer.byteLength(companyList));
        res.send(200, companyList);
        next();
    });
}

function getCompany(req, res, next) {
    db.read(req.dir, req.url.pathname, function (err, data) {
        if (err && err !== '404') {
            req.log.warn(err, 'getCompany: unable to read %s', req.url.pathname);
            next(err);
            return;
        };
        if (err && err === '404') {
            next(new errors.NotFoundError());
            return;
        };
        var company = {
            _id: data._id,
            _data: data._data,
            _status: data._status,
            _lastModified: data._lastModified,
            _links: data._links,
        }
        res.send(200, company);
        next();
    });
}

function putCompany(req, res, next) {
    var company = {
        _id: req.url.pathname,
        _data: req.params._data,
        _status: 'active',
        _lastModified: (new Date()).toJSON(),
        _links: {
            _self: req.url.pathname,
            _documents: req.url.pathname + '/documents',
            _settings: req.url.pathname + '/settings'
        }
    };

    db.update(req.dir, req.url.pathname, company, function (err) {
        if (err && err !== '404') {
            req.log.warn(err, 'putCompany: unable to save');
            next(err);
            return;
        };
        if (err && err === '404') {
            next(new errors.NotFoundError());
            return;
        };
        req.log.debug({company: company}, 'putCompany: done');
//        res.setHeader('Content-Length', Buffer.byteLength(company));
        res.send(200, company);
        next();
    });
}

function deleteCompany(req, res, next) {
    db.read(req.dir, req.url.pathname, function (err, data) {
        if (err && err !== '404') {
            req.log.warn(err, 'deleteCompany: unable to read %s', req.url.pathname);
            next(err);
            return;
        };
        if (err && err === '404') {
            next(new errors.NotFoundError());
            return;
        };
        var company = data;
        company._status = 'deleted';
        company._lastModified = (new Date()).toJSON();
        db.update(req.dir, req.url.pathname, company,function (err) {
            if (err && err !== '404') {
                req.log.warn(err, 'deleteCompany: unable to delete %s', req.url.pathname);
                next(err);
                return;
            };
            if (err && err === '404') {
                next(new errors.NotFoundError());
                return;
            };
            req.log.debug({path: req.url.pathname}, 'deleteCompany: done');
            res.send(204);
            next();
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

