// Copyright (c) 2012 Mark Cavage. All rights reserved.
// Copyright (c) 2015 Pedro Vieira.

var fs = require('fs');
var path = require('path');
var util = require('util');

var assert = require('assert-plus');
var bunyan = require('bunyan');
var getopt = require('posix-getopt');
var restify = require('restify');

var vegapi = require('./lib');

///--- Helpers

function parseOptions() {
  var opt;
  var opts = {};
  var parser = new getopt.BasicParser('ha:p:k:d:', process.argv);

  while ((opt = parser.getopt()) !== undefined) {
    switch (opt.option) {
      case 'a':
        opts.application = opt.optarg;
        break;

      case 'h':
        usage();
        break;

      case 'p':
        opts.port = parseInt(opt.optarg, 10);
        break;

      case 'k':
        opts.key = opt.optarg;
        break;

      case 'd':
        opts.directory = opt.optarg;
        break;

      default:
        usage('invalid opt: ' + opt.option);
        break;
      }
  }

  return (opts);
}

function usage(msg) {
  if (msg) {
    console.error(msg);
  }

  var str = 'usage: ' +
    name +
    ' [-a application] [-k key] [-p port] [-d path]';
  console.error(str);
  process.exit(msg ? 1 : 0);
}

function initLogger(logName) {
  // Debug messages go to stderr and audit records go to stdout
  var log = bunyan.createLogger({
    name: logName,
    streams: [
      {
        level: (process.env.LOG_LEVEL || 'info'),
        stream: process.stderr
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
          stream: process.stderr
        })
      }
    ],
    serializers: restify.bunyan.serializers
  });
  return (log);
}


///--- Mainline

(function main() {

  var options = parseOptions();
  options.name = options.application || 'sample';
  options.port = options.port || 8080;

  var log = initLogger(options.name);
  log.level(process.env.LOG_LEVEL || 'info');
  options.log = log;

  // Setup a directory for this app - database, logs...
  options.directory = path.join((options.directory || '/tmp'), options.name);
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
    }
    options.database = result;

    var server = vegapi.createServer(options);

    log.info({options: options}, 'Server created with: ');

    // At last, let's rock and roll
    server.listen(options.port, function onListening() {
      log.info('API %s listening at %s', options.name, server.url);
    });
  });
})();
