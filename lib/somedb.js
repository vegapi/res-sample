
var fs = require('fs');
var filePath = require('path');

function createDb(options) {
  var log = options.log;
  var db = {

    create: function (dir, path, data, next) {
      var p = filePath.join(dir, path.replace(/\//g, '+'));
      fs.writeFile(p, JSON.stringify(data), function (err) {
        next(err);
        return;
      });
    },

    list: function (dir, path, next) {

      function sameCollection(filename) {
        return (filename.substr(0, path.length) === path.replace(/\//g, '+'));
      }

      function intoNameAndUrl(filename, index, list) {
        var content = fs.readFileSync(filePath.join(dir, filename));
//        log.debug({content: JSON.parse(content)}, 'file contents');
        return [JSON.parse(content), filename.replace(/\+/g, '/')];
      }

      fs.readdir(dir, function (err, data) {
        if (err) {
          next(err);
          return;
        }
        var list = data.filter(sameCollection).map(intoNameAndUrl);
//        log.debug({map: list}, 'filtered & mapped list');
        next(null, list);
        return;
      });
    },

    read: function (dir, path, next) {
      var p = filePath.join(dir, path.replace(/\//g, '+'));
      fs.readFile(p, function (err, data) {
        if (err && err.code === 'ENOENT') {
          err = '404';
        }
        if (err) {
          next(err);
          return;
        }
        next(err, JSON.parse(data));
        return;
      });
    },

    update: function (dir, path, data, next) {
      var p = filePath.join(dir, path.replace(/\//g, '+'));
      fs.writeFile(p, JSON.stringify(data), function (err) {
        next(err);
        return;
      });
    },

    remove: function (dir, path, next) {
      var p = filePath.join(dir, path.replace(/\//g, '+'));
      var newP = filePath.normalize(dir + '.' + path.replace(/\//g, '+'));
      fs.rename(p, newP, function (err) {
        if (err && err.code === 'ENOENT') {
          log.warn(err, p, 'ERROR in DB');
          err = '404';
        }
        next(err);
        return;
      });
    }
  };

  return db;
}

module.exports = {
  createDb: createDb
};
