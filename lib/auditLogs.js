// Copyright (c) 2015 Pedro Vieira.

var assert = require('assert-plus');
var path = require('path');
var fs = require('fs');
//var bunyan = require('bunyan');
var restify = require('restify');
var parseUrl = require('url');
var shortId = require('shortid');
var querystring = require('querystring');
var async = require('async');


function listLogs(req, res, next) {

    var logList = {
        _data: [],
        _links: {
            _self: req.url.pathname
        }
    };

    var logDir = path.join(req.dir, 'logs');

    var getFileChangeTimestamp = function (filename, cb) {
        fs.stat(path.join(logDir, filename), function (err, stats) {
            if (err) {
                req.log.warn(err, 'Could not access log file %s', filename);
                cb(err);
            }
            req.log.debug({filename: filename, stats: stats}, 'Log stats read');
            cb(null, [filename, stats.mtime]);
            return;
        });
    };

    fs.readdir(logDir, function (err, files) {
        if (err) {
            req.log.warn(err, 'ListLogs: unable to list ', logDir);
            next(err);
            return;
        }
        async.mapSeries(files, getFileChangeTimestamp, function (err, result) {
            if (err) {
                req.log.warn(err, 'Could not access some log files in %s', logDir);
                next(err);
                return;
            }

            req.log.debug({logDir: logDir, stats: result}, 'Log stats read');
            result.forEach(function (item) {
                logList._data.push({
                    _id: item[0],
                    _lastModifiedDate: item[1]
                });
            });

            res.setHeader('Content-Length', Buffer.byteLength(logList));
            res.send(200, logList);
            req.log.debug({path: req.url.pathname}, 'listLogs: done');
            next();
        });
    });
}

function getLog(req, res, next) {

    var logPath = path.join(req.dir, 'logs', req.params.logId);
    fs.stat(logPath, function(err, stats) {
        if (err) {
            req.log.warn(err, 'Could not access log file %s', logPath);
            next(err);
            return;
        }
        
        var fstream = fs.createReadStream(logPath);
        fstream.once('open', function (fd) {
            res.cache('private', {maxAge: 86400});
            res.set('Content-Length', stats.size);
            res.set('Content-Type', 'application/json');
            res.set('Last-Modified', stats.mtime);
            res.writeHead(200);
            fstream.pipe(res);
            fstream.once('end', function () {
                req.log.debug({path: req.url.pathname}, 'getLog: done');
                next();
            });
        });
    });
}

function auditLogger(options) {
    assert.object(options, 'options');
    assert.object(options.log, 'options.log');

    var log = options.log.child({
        audit: true,
        serializers: {
            req: function auditRequestSerializer(req) {
                if (!req) {
                    return (false);
                }

                return ({
                    // account for native and queryParser plugin usage
                    query: (typeof req.query === 'function') ?
                            req.query() : req.query,
                    method: req.method,
                    url: req.url,
                    headers: req.headers,
                    httpVersion: req.httpVersion,
                    trailers: req.trailers,
                    version: req.version(),
                    body: options.body === true ?
                        req.body : undefined
                });
            },
            res: function auditResponseSerializer(res) {
                if (!res) {
                    return (false);
                }

                var body;

                if (options.body === true) {
//                    if (res._body instanceof HttpError) {
//                        body = res._body.body;
//                    } else {
                        body = res._body;
//                    }
                }

                return ({
                    statusCode: res.statusCode,
                    headers: res._headers,
                    trailer: res._trailer || false,
                    body: body
                });
            }
        }
    });

    function audit(req, res, route, err) {
        var latency = res.get('Response-Time');

        if (typeof (latency) !== 'number') {
            latency = Date.now() - req._time;
        }

        var obj = {
            remoteAddress: req.connection.remoteAddress,
            remotePort: req.connection.remotePort,
            req_id: req.getId(),
            req: req,
            res: res,
            latency: latency,
            secure: req.secure,
            _audit: true
        };

        log.info(obj, 'Handled: %d', res.statusCode);

        var timers = {};
        (req.timers || []).forEach(function (time) {
            var t = time.time;
            var _t = Math.floor((1000000 * t[0]) +
                (t[1] / 1000));
            timers[time.name] = _t;
        });

        if (err) {
            obj.err = err;
            obj.timers = timers;
            req.log.info(obj, 'Handled %d', res.statusCode);
        }

        return (true);
    }

    return (audit);
}


module.exports = {
    listLogs: listLogs,
    getLog: getLog,
    auditLogger: auditLogger,
};
