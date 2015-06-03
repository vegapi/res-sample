// Copyright (c) 2012 Mark Cavage. All rights reserved.
// Copyright (c) 2015 Pedro Vieira.

//var fs = require('fs');
//var path = require('path');
var util = require('util');
var parseUrl = require('url');
var assert = require('assert-plus');
var bunyan = require('bunyan');
var restify = require('restify');
var companies = require('./companies');
var documents = require('./documents');
var users = require('./users');
var profiles = require('./profiles');

///--- Handlers

///--- API

// Returns a server with all routes defined on it

function createServer(options) {
    assert.object(options, 'options');
    assert.string(options.directory, 'options.directory');
    assert.object(options.log, 'options.log');
    assert.object(options.database, 'options.database');

    function setup(req, res, next) {
        // req.dir = options.directory;
        req.db = options.database;
        req.log = options.log;
        req.url = parseUrl.parse(req.url, true);
        if (req.url.hostname) {
            // extracts application (= subdomain name) from url
            req.application = /[^.:]+/.exec(req.url.hostname)[0];
        } else {
            // extracts application from Host header
            req.application = /[^.:]+/.exec(req.header('Host'))[0];
            }
        options.log.debug('application %s requested', req.application);
        next();
    }

    function authenticate(req, res, next) {
        if (!options.application) {
            req.log.debug('skipping authentication');
            next();
            return;
        }

        var authz = req.authorization.basic;
        if (!authz) {
            res.setHeader('WWW-Authenticate', 'Basic realm="' + options.application + '"');
            next(new restify.UnauthorizedError('Authentication required'));
            return;
        }

        if (authz.username !== options.application || authz.password !== options.key) {
            res.setHeader('WWW-Authenticate', 'Basic realm="' + options.application + '"');
            next(new restify.InvalidCredentialsError('Authentication required - invalid credentials'));
            return;
        }

        if (req.application !== options.application) {
            next(new restify.ForbiddenError('Invalid credentials for resource requested'));
            return;
        }

        next();
    }

    var server = restify.createServer({
        log: options.log,
        name: options.application,
        version: '0.1.0',
        acceptable: ['application/json']
    });

    // Ensure we don't drop data on uploads
    server.pre(restify.pre.pause());

    // Clean up sloppy paths like //todo//////1//
    server.pre(restify.pre.sanitizePath());

    // Handles annoying user agents (curl)
    server.pre(restify.pre.userAgentConnection());

    // Set a per request bunyan logger (with requestid filled in)
    server.use(restify.requestLogger());

    // Allow 50 requests/second by IP, and burst to 100
    server.use(restify.throttle({
        burst: 100,
        rate: 50,
        ip: true,
    }));

    // Use the common stuff you probably want
    server.use(restify.acceptParser(server.acceptable));
    server.use(restify.dateParser());
    server.use(restify.authorizationParser());
    server.use(restify.queryParser({mapParams: false}));
    server.use(restify.gzipResponse());
    server.use(restify.bodyParser({
        mapParams: false,
        maxBodySize: 0,
    }));

    // Setup data for database and authentication/authorization
    server.use(setup);
    server.use(authenticate);

    // Register root '/' (companies) handler
    server.post('/', [companies.validateCompany, 
                      companies.createCompany]);
    server.get('/', companies.listCompanies);
    server.get('/:companyId', companies.getCompany);
    server.put('/:companyId', [companies.validateCompany,
                          companies.putCompany]);
    server.del('/:companyId', companies.deleteCompany);

    // Register documents handler
    server.post('/:companyId/documents', [documents.validateDocument, 
                                          documents.createDocument]);
    server.get('/:companyId/documents', documents.listDocuments);
    server.get('/:companyId/documents/:documentId', documents.getDocument);
    server.put('/:companyId/documents/:documentId', [documents.validateDocument,
                                                     documents.putDocument]);
    server.del('/:companyId/documents/:documentId', documents.deleteDocument);

    server.post('/:companyId/users', [users.validateUser, 
                                          users.createUser]);
    server.get('/:companyId/users', users.listUsers);
    server.get('/:companyId/users/:documentId', users.getUser);
    server.put('/:companyId/users/:documentId', [users.validateUser,
                                                     users.putUser]);
    server.del('/:companyId/users/:documentId', users.deleteUser);

    server.post('/:companyId/profiles', [profiles.validateProfile, 
                                          profiles.createProfile]);
    server.get('/:companyId/profiles', profiles.listProfiles);
    server.get('/:companyId/profiles/:documentId', profiles.getProfile);
    server.put('/:companyId/profiles/:documentId', [profiles.validateProfile,
                                                     profiles.putProfile]);
    server.del('/:companyId/profiles/:documentId', profiles.deleteProfile);

    // Setup an audit logger
    if (!options.noAudit) {
        server.on('after', restify.auditLogger({
            body: true,
            log: bunyan.createLogger({
                level: 'info',
                name: options.application + '-audit',
                stream: process.stdout
            })
        }));
    }

    return (server);
}


///--- Exports

module.exports = {
    createServer: createServer
};
