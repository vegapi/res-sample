// Copyright (c) 2012 Mark Cavage. All rights reserved.
// Copyright (c) 2015 Pedro Vieira.

var fs = require('fs');
var path = require('path');
var util = require('util');
var parseUrl = require('url');
var assert = require('assert-plus');
var bunyan = require('bunyan');
var restify = require('restify');
var companies = require('./companies');

///--- Handlers

///--- API

// Returns a server with all routes defined on it

function createServer(options) {
    assert.object(options, 'options');
    assert.string(options.directory, 'options.directory');
    assert.object(options.log, 'options.log');

    function validateHeaders(req, res, next) {
        if (!req.header('Host')) {
            next(new restify.InvalidHeaderError('Host header required'));
            return;
        }
        next();
    };

    function setup(req, res, next) {
        req.dir = options.directory;
        req.url = parseUrl.parse(req.url, true);
        if (req.url.hostname) {
            // extracts application (= subdomain name) from url
            req.application = /[^.:]+/.exec(req.url.hostname)[0];
        } else {
            // extracts application from Host header
            req.application = /[^.:]+/.exec(req.header('Host'))[0];
            };
        req.log.debug({app: req.application}, 'request application identifier');
        next();
    };

    function authenticate(req, res, next) {
        if (!options.application) {
            req.log.debug('Skipping authentication');
            next();
            return;
        };

        var authz = req.authorization.basic;
        if (!authz) {
            res.setHeader('WWW-Authenticate', 'Basic realm="' + option.application + '"');
            next(new restify.NotAuthorizedError('Authentication required'));
            return;
        };

        if (authz.username !== options.application || authz.password !== options.key) {
            res.setHeader('WWW-Authenticate', 'Basic realm="' + option.application + '"');
            next(new restify.NotAuthorizedError('Authentication required - invalid credentials'));
            return;
        };

        if (req.application !== options.application) {
            next(new restify.InvalidCredentialsError('Invalid credentials for resource requested'));
            return;
        };

        next();
    };

    var server = restify.createServer({
        log: options.log,
        name: 'vegapi-' + options.application,
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

    // Allow 5 requests/second by IP, and burst to 10
    server.use(restify.throttle({
        burst: 10,
        rate: 5,
        ip: true,
    }));

    // Use the common stuff you probably want
    server.use(restify.acceptParser(server.acceptable));
    server.use(restify.dateParser());
    server.use(restify.authorizationParser());
    server.use(restify.queryParser());
    server.use(restify.gzipResponse());
    server.use(restify.bodyParser());

    server.use(validateHeaders);
    // Setup data for database and authentication/authorization
    server.use(setup);
    server.use(authenticate);

    // Register root '/' handler
    server.post('/', [companies.validateCompany, 
                      companies.createCompany]);
    server.get('/', companies.listCompanies);
    server.get('/:name', companies.getCompany);
    server.put('/:name', [companies.validateCompany,
                          companies.putCompany]);
    server.del('/:name', companies.deleteCompany);

    // Setup an audit logger
    if (!options.noAudit) {
        server.on('after', restify.auditLogger({
            body: true,
            log: bunyan.createLogger({
                level: 'info',
                name: 'vegapi-audit',
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
