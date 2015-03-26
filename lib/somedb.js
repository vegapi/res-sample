
var fs = require('fs');
var filePath = require('path');

function createCo(dir, path, data, next) {
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
}

function create(dir, path, data, next) {
	var p = filePath.normalize(dir + path);
	fs.writeFile(p, JSON.stringify(data), function(err) {
		next(err);
		return;		
	});
}

function list(dir, path, next) {
	var p = filePath.normalize(dir + path);
	fs.readdir(p, function(err, data) {
		if (err && err.code === 'ENOENT') {
			err = '404';
		};
		next(err, data);
		return;
	});
}

function read(dir, path, next) {
	var p = filePath.normalize(dir + path);
	fs.stat(p, function (err, fileInfo) {
		if (err && err.code === 'ENOENT') {
			err = '404';
		};
		if (err) {
			next(err);
			return;
		};
		if (fileInfo.isDirectory()) {
			p = filePath.normalize(dir + path + '/*');
		};
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
	});
}

function update(dir, path, data, next) {
	var p = filePath.normalize(dir + path);
	fs.stat(p, function (err, fileInfo) {
		if (err && err.code === 'ENOENT') {
			err = '404';
		};
		if (err) {
			next(err);
			return;
		};
		if (fileInfo.isDirectory()) {
			p = filePath.normalize(dir + path + '/*');
		};
		fs.writeFile(p, JSON.stringify(data), function(err) {
			next(err);
			return;
		});
	});
}

function remove(dir, path, next) {
	var p = filePath.normalize(dir + path);
	fs.stat(p, function (err, fileInfo) {
		if (err && err.code === 'ENOENT') {
			err = '404';
		};
		if (err) {
			next(err);
			return;
		};
		if (fileInfo.isDirectory()) {
			p = filePath.normalize(dir + path + '/*');
		};
		fs.unlink(p, function(err) {
			if (err && err.code === 'ENOENT') {
				err = '404';
			};
			next(err);
			return;
		});
	});
}

module.exports = {
	createCo: createCo,
	create: create,
	list: list,
	read: read,
	update: update,
	remove: remove
};