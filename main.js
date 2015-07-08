// Copyright (c) 2012 Mark Cavage. All rights reserved.
// Copyright (c) 2015 Pedro Vieira.

var fs = require('fs');
var path = require('path');
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');
var logentries = require('bunyan-logentries');
var restify = require('restify');
var vegapi = require('./lib');


///--- Helpers

function initLogger(logName, logToken, logLevel) {
  // Debug messages go to stderr and audit records go to stdout
  var log = bunyan.createLogger({
    name: logName,
    streams: [
      {
        level: logLevel,
        stream: logentries.createStream({token: logToken}),
        type: 'raw'
      },
      {
        // This ensures that if we get a WARN or above all debug records
        // related to that request are spewed to stderr - makes it nice
        // filter out debug messages in prod, but still dump on user
        // errors so you can debug problems
        level: 'debug',
        type: 'raw',
        stream: new restify.bunyan.RequestCaptureStream({
          level: bunyan.WARN,
          maxRecords: 100,
          maxRequestIds: 1000,
          stream: logentries.createStream({token: logToken})
        })
      }
    ],
    serializers: restify.bunyan.serializers
  });
  return (log);
}


///--- Mainline

(function main() {

  var options = {};
  options.application = process.env.VG_APP;
  options.name = options.application || 'sample';
  options.key = process.env.VG_KEY;
  options.host = process.env.VG_HOST || 'vegapi.org';
  options.port = parseInt(process.env.VG_PORT, 10) || 8080;
  options.logToken = process.env.VG_LOG_TOKEN;
  options.logLevel = process.env.VG_LOG_LEVEL || 'info';

  var log = initLogger(options.name, options.logToken, options.logLevel);
  options.log = log;

  // Setup a directory for this app - database, logs...
  options.directory = path.join((process.env.VG_DIR || '/tmp'), options.name);
  try {
    fs.mkdirSync(options.directory);
  } catch (e) {
    if (e.code !== 'EEXIST') {
        log.fatal(e, 'unable to create directory %s', options.directory);
        process.exit(1);
    }
  }
  
  vegapi.createDb(options, function (err, result) {
    if (err) {
      log.fatal(err, 'unable to initialize database');
      process.exit(1);
    } else {
      options.database = result;

      var server = vegapi.createServer(options);
      log.info([options.name, options.host, options.port, options.key, options.directory], 
        'Server created with: ');

      // At last, let's rock and roll
      server.listen(options.port, function onListening() {
        log.info('API %s listening at %s', options.name, server.url);
      });
    }
  });
})();
