
var nedb = require('nedb');
var filePath = require('path');
var assert = require('assert-plus');
var async = require('async');

function createDb(options, next) {
  assert.object(options, 'options');
  assert.string(options.directory, 'options.directory');
  assert.object(options.log, 'options.log');

  var log = options.log;
  
  var dbnames = ['companies', 'documents', 'settings'];  

  var db = {};

  var loadDb = function (dbname, cb) {
    db = new nedb({filename: filePath.join(options.directory, dbname)});
    db.loadDatabase(function (err) {
      if (err) {
        log.warn(err, 'could not load database %s', db.filename);
        cb(err);
      };
      log.debug({filename: db.filename}, 'Db loaded');    
      cb(null, [dbname, db]);
    });
  };

  // Load databases; exit if errors, else build and return db handlers
  async.mapSeries(dbnames, loadDb, function (err, result) {
    if (err) {
      log.fatal(err, 'Could not load some databases');
      next(err);
      return;
    };
    result.forEach(function (item) {db[item[0]] = item[1]});

    var handlers = {

      create: function (type, id, data, next) {
        data._id = id;
        db[type].insert(data, function (err, res) {
          next(err);
          return;
        });
      },

      list: function (type, filter, next) {

        //log.debug({filter: filter}, 'initial list query')
        filter['_status'] = {$nin: ['empty', 'deleted']};
        db[type].find(filter, function (err, data) {
          if (err) {
            next(err);
            return;
          }
          //log.debug({list: data}, 'filtered list');
          next(null, data);
          return;
        });
      },

      read: function (type, id, next) {

        db[type].findOne({_id: id}, function (err, data) {
          if (!data) {
            err = '404';
          }
          if (data && data['_status'] === 'deleted') {
            err = '410';
          }
          if (err) {
            next(err);
            return;
          }
          next(null, data);
          return;
        });
      },

      update: function (type, id, data, next) {

        db[type].update({_id: id}, data, {}, function (err) {
          next(err);
          return;
        });
      },

      remove: function (type, id, next) {

        db[type].remove({_id: id}, {}, function (err, num) {
          if (!err && num === 0) {
            err = '404';
          }
          next(err);
          return;
        });
      }
    };
    next(null, handlers);
    return;
  });
}

module.exports = {
  createDb: createDb
};
