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


///--- Globals
var NAME = 'vegapi';

// Debug messages go to stderr and audit records go to stdout
var LOG = bunyan.createLogger({
  name: NAME,
  streams: [
    {
      level: (process.env.LOG_LEVEL || 'info'),
      type:'rotating-file',
      path: './logs/info.log',
      period: '1d',
      count: 3
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
        type:'rotating-file',
        path: './logs/debug.log',
        period: '1h',
        count: 3
      })
    }
  ],
  serializers: restify.bunyan.serializers
});



///--- Helpers

/**
 * Standard POSIX getopt-style options parser.
 *
 * Some options, like directory/user/port are pretty cut and dry, but note
 * the 'verbose' or '-v' option afflicts the log level, repeatedly. So you
 * can run something like:
 *
 * node main.js -p 80 -vv 2>&1 | bunyan
 *
 * And the log level will be set to TRACE.
 */
function parseOptions() {
  var option;
  var opts = {};
  var parser = new getopt.BasicParser('hva:p:k:', process.argv);

  while ((option = parser.getopt()) !== undefined) {
    switch (option.option) {
      case 'a':
        opts.application = option.optarg;
        break;

      case 'h':
        usage();
        break;

      case 'p':
        opts.port = parseInt(option.optarg, 10);
        break;

      case 'v':
        // Allows us to set -vvv -> this little hackery
        // just ensures that we're never < TRACE
        LOG.level(Math.max(bunyan.TRACE, (LOG.level() - 10)));
        if (LOG.level() <= bunyan.DEBUG) 
          LOG = LOG.child({src: true});
        break;

      case 'k':
        opts.key = option.optarg;
        break;

      default:
        usage('invalid option: ' + option.option);
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
    ' [-v] [-a application] [-k key] [-p port]';
  console.error(str);
  process.exit(msg ? 1 : 0);
}


///--- Mainline

(function main() {

  var options = parseOptions();
  options.name = options.application || 'sample';

  LOG.debug({options: options}, 'command line arguments parsed');

  // Setup a directory for the database
  var dir = path.join('/tmp', options.name, '/');
  try {
    fs.mkdirSync(dir);
  } catch (e) {
    if (e.code !== 'EEXIST') {
        LOG.fatal(e, 'unable to create "database" %s', dir);
        process.exit(1);
    }
  }


  options.directory = dir;
  options.log = LOG;
  options.port = options.port || 8080;

  vegapi.createDb(options, function (err, result) {
    if (err) {
      LOG.fatal(err, 'unable to initialize database');
      process.exit(1);
    }
    options.database = result;

    var server = vegapi.createServer(options);

    // At last, let's rock and roll
    server.listen(options.port, function onListening() {
      LOG.info('API %s listening at %s', options.name, server.url);
    });
  });
})();
