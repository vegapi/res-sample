// Copyright (c) 2012 Mark Cavage. All rights reserved.
// Copyright (c) 2014 Pedro Vieira.

var fs = require('fs');
var path = require('path');
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');
var restify = require('restify');
var res = require('./res');

///--- Formatters

/**
 * This is a nonsensical custom content-type 'application/todo', just to
 * demonstrate how to support additional content-types.  Really this is
 * the same as text/plain, where we pick out 'task' if available


function formatTodo(req, res, body) {
    if (body instanceof Error) {
        res.statusCode = body.statusCode || 500;
        body = body.message;
    } else if (typeof (body) === 'object') {
        body = body.task || JSON.stringify(body);
    } else {
        body = body.toString();
    }

    res.setHeader('Content-Length', Buffer.byteLength(body));
    return (body);
} 
*/

///--- Handlers

/**
 * Only checks for HTTP Basic Authenticaion
 *
 * Some handler before is expected to set the accepted user/pass combo
 * on req as:
 *
 * req.allow = { user: '', pass: '' };
 *
 * Or this will be skipped.
 */
function authenticate(req, res, next) {
    if (!req.allow) {
        req.log.debug('skipping authentication');
        next();
        return;
    }

    var authz = req.authorization.basic;
    if (!authz) {
        res.setHeader('WWW-Authenticate', 'Basic realm="vegapi.org"');
        next(new restify.UnauthorizedError('authentication required'));
        return;
    }

    if (authz.username !== req.allow.user || authz.password !== req.allow.pass) {
        next(new restify.ForbiddenError('invalid credentials'));
        return;
    }

    next();
}



///--- API

/**
 * Returns a server with all routes defined on it
 */
function createServer(options) {
    assert.object(options, 'options');
    assert.string(options.directory, 'options.directory');
    assert.object(options.log, 'options.log');

    // Create a server with our logger
    // Note that 'version' means all routes will default to
    // 1.0.0
    var server = restify.createServer({
//      formatters: {
//          'application/todo; q=0.9': formatTodo
//      },
        log: options.log,
        name: 'VEGAPI',
        version: '0.0.0'
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

    // Now our own handlers for authentication/authorization
    // Here we only use basic auth, but really you should look
    // at https://github.com/joyent/node-http-signature
    server.use(function setup(req, res, next) {
        req.dir = options.directory;
        if (options.user && options.password) {
            req.allow = {
                user: options.user,
                password: options.password
            };
        }
        next();
    });
    server.use(authenticate);

    /// Now the real handlers. Here we just CRUD on TODO blobs

    server.use(res.loadTodos);

    server.post('/todo', res.createTodo);
    server.get('/todo', res.listTodos);
    server.head('/todo', res.listTodos);


    // everything else requires that the TODO exist
    server.use(res.ensureTodo);

    // Return a TODO by name

    server.get('/todo/:name', res.getTodo);
    server.head('/todo/:name', res.getTodo);

    // Overwrite a complete TODO - here we require that the body
    // be JSON - otherwise the caller will get a 415 if they try
    // to send a different type
    // With the body parser, req.body will be the fully JSON
    // parsed document, so we just need to serialize and save
    server.put({
        path: '/todo/:name',
        contentType: 'application/json'
    }, res.putTodo);

    // Delete a TODO by name
    server.del('/todo/:name', res.deleteTodo);

    // Register a default '/' handler

    server.get('/', function root(req, res, next) {
        var routes = [
            'GET     /',
            'POST    /todo',
            'GET     /todo',
            'PUT     /todo/:name',
            'GET     /todo/:name',
            'DELETE  /todo/:name'
        ];
        res.send(200, routes);
        next();
    });

    // Setup an audit logger
    if (!options.noAudit) {
        server.on('after', restify.auditLogger({
            body: true,
            log: bunyan.createLogger({
                level: 'info',
                name: 'todoapp-audit',
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
