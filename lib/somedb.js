
var fs = require('fs');
var filePath = require('path');

/*function createCo(dir, path, data, next) {
	var p = filePath.normalize(dir + path);
	fs.mkdir(p, function(err) {
		if (err) {
			next(err);
			return;
		};
		p = filePath.normalize(dir + path + '/*');
		fs.writeFile(p, JSON.stringify(data), function(err) {
			next(err);
			return;
		});
	});
}*/

function create(dir, path, data, next) {
	var p = filePath.join(dir, path.replace(/\//g, '+'));
	fs.writeFile(p, JSON.stringify(data), function(err) {
		next(err);
		return;		
	});
}

function list(dir, path, next) {

	function sameList (filename) {
		return (filename.substr(0, path.length) === path.replace(/\//g, '+'));
	}

	function intoUrl (filename) {
		return (filename.replace(/\+/g, '/'));
	}

	//var p = filePath.normalize(dir + path);
	fs.readdir(dir, function(err, data) {
		if (err) {
			next(err);
			return;
		};
		next(null, data.filter(sameList).map(intoUrl));
		return;
	});
}

function read(dir, path, next) {
	var p = filePath.join(dir, path.replace(/\//g, '+'));
	/*fs.stat(p, function (err, fileInfo) {
		if (err && err.code === 'ENOENT') {
			err = '404';
		};
		if (err) {
			next(err);
			return;
		};
		if (fileInfo.isDirectory()) {
			p = filePath.normalize(dir + path + '/*');
		};*/
		fs.readFile(p, function (err, data) {
			if (err && err.code === 'ENOENT') {
				err = '404';
			};
			if (err) {
				next(err);
				return;
			} else {
				next(err, JSON.parse(data));
				return;
			};
		});
	//});
}

function update(dir, path, data, next) {
	var p = filePath.join(dir, path.replace(/\//g, '+'));
	/*fs.stat(p, function (err, fileInfo) {
		if (err && err.code === 'ENOENT') {
			err = '404';
		};
		if (err) {
			next(err);
			return;
		};
		if (fileInfo.isDirectory()) {
			p = filePath.normalize(dir + path + '/*');
		};*/
		fs.writeFile(p, JSON.stringify(data), function(err) {
			next(err);
			return;
		});
	//});
}

function remove(dir, path, next) {
	var p = filePath.join(dir, path.replace(/\//g, '+'));
	/*fs.stat(p, function (err, fileInfo) {
		if (err && err.code === 'ENOENT') {
			err = '404';
		};
		if (err) {
			next(err);
			return;
		};
		if (fileInfo.isDirectory()) {
			p = filePath.normalize(dir + path + '/*');
		};*/
		fs.rename(p, filePath.join(dir, '.', path), function(err) {
			if (err && err.code === 'ENOENT') {
				err = '404';
			};
			next(err);
			return;
		});
	//});
}

module.exports = {
	//createCo: createCo,
	create: create,
	list: list,
	read: read,
	update: update,
	remove: remove
};