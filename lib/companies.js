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

// validateCompany only called for POST and PUT
function validateCompany(req, res, next) {

    if (req.body && (isEmpty(req.body) && req.method === "POST")) {
        next();
        return;
    }
    if (!req.body || (req.body && !req.body._data)) {
        next(new restify.InvalidContentError('Missing content for ' + req.url.pathname));
        return;
    }

    var company = req.body._data;
    var valid = company._name &&
            company._taxNumber &&
            company._country &&
            company._currency &&
            company._description &&
            company._addresses &&
            company._addresses._main;
    if (!valid) {
        next(new restify.InvalidContentError('Invalid or missing attributes for ' + req.url.pathname));
        return;
    }
    next();
}

function createCompany(req, res, next) {

    var newId = req.url.pathname + shortId.generate();
    var company = {
        _id: newId,
        _data: {}
    };

    if (req.body && isEmpty(req.body)) {
        company._status = "empty";
        company._lastModifiedDate = (new Date()).toJSON();
    } else {
        company._data = req.body._data;
        company._status = 'active';
        company._lastModifiedDate = (new Date()).toJSON();
        company._links = {
            _self: newId,
            _company: newId,
            _documents: newId + '/documents',
            _payments: newId + '/payments',
            _cashTransactions: newId + '/cashTransactions',
            _entities: newId + '/entities',
            _items: newId + '/items',
            _accountingBatches: newId + '/accountingBatches',
            _accountingErrors: newId + '/accountingErrors',
            _fiscalYearEnds: newId + '/fiscalYearEnds',
            _accountStatements: newId + '/accountStatements',
            _balanceSheets: newId + '/balanceSheets',
            _incomeStatements: newId + '/incomeStatements',
            _cashflowStatements: newId + '/cashflowStatements',
            _vatReturns: newId + '/vatReturns',
            _drafts: newId + '/drafts',
            _users: newId + '/users',
            _profiles: newId + '/profiles',
            _settings: newId + '/settings'
        };
    }

    req.db.create('companies', newId, company, function (err) {
        if (err) {
            req.log.warn(err, 'createCompany: unable to create ', newId);
            next(err);
            return;
        }
        res.setHeader('Location', newId);
        //res.setHeader('Content-Length', Buffer.byteLength(company));
        res.send(201, company);
        req.log.debug({path: newId}, 'createCompany: done');
        next();
    });
}

function listCompanies(req, res, next) {

    var companyList = {
        _data: [],
        _links: {
            _self: '/'
        }
    };

    function project (company) {
        companyList._data.push({
            _id: company._id,
            _name: company._data._name
        });
    }

    var qstring = querystring.stringify(req.query);
    if (qstring !== '') {
        companyList._links._self = companyList._links._self + '?' + qstring;
        if (req.query.name) {
            req.query['_data._name'] = req.query.name;
            delete req.query.name;
        }
    }
    
    req.db.list('companies', req.query, function (err, data) {
        if (err && err === '404') {
            next(new restify.NotFoundError(req.url.pathname + 'was not found'));
            return;
        }
        if (err && err !== '404') {
            req.log.warn(err, 'listCompanies: unable to list ', req.url.pathname);
            next(err);
            return;
        }
        data.forEach(project);
        res.setHeader('Content-Length', Buffer.byteLength(companyList));
        res.send(200, companyList);
        req.log.debug({path: req.url.pathname}, 'listCompany: done');
        next();
    });
}

function getCompany(req, res, next) {

    req.db.read('companies', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'getCompany: unable to read ', req.url.pathname);
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
        var company = {
            _id: data._id,
            _data: data._data,
            _status: data._status,
            _lastModifiedDate: data._lastModifiedDate,
            _links: data._links,
        };
        res.send(200, company);
        req.log.debug({path: req.url.pathname}, 'getCompany: done');
        next();
    });
}

function putCompany(req, res, next) {

    req.db.read('companies', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'deleteCompany: unable to read ', req.url.pathname);
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

        var company = {
            _id: req.url.pathname,
            _data: req.body._data,
            _status: 'active',
            _lastModifiedDate: (new Date()).toJSON(),
            _links: data._links
        };

        req.db.update('companies', req.url.pathname, company, function (err) {
            if (err && err !== '404') {
                req.log.warn(err, 'putCompany: unable to save ', req.url.pathname);
                next(err);
                return;
            }
            if (err && err === '404') {
                next(new restify.NotFoundError(req.url.pathname + ' was not found'));
                return;
            }
            //res.setHeader('Content-Length', Buffer.byteLength(company));
            res.send(200, company);
            req.log.debug({path: req.url.pathname}, 'putCompany: done');
            next();
        });
    });
}

function deleteCompany(req, res, next) {

    req.db.read('companies', req.url.pathname, function (err, data) {
        if (err && (err !== '404' && err !== '410')) {
            req.log.warn(err, 'deleteCompany: unable to read ', req.url.pathname);
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
        var company = data;
        company._status = 'deleted';
        company._lastModifiedDate = (new Date()).toJSON();
        req.db.update('companies', req.url.pathname, company, function (err) {
            if (err) {
                req.log.warn(err, 'deleteCompany: unable to update ', req.url.pathname);
                next(err);
                return;
            }
            res.send(204);
            req.log.debug({path: req.url.pathname}, 'deleteCompany: done');
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

