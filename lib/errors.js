// Copyright (c) 2012 Mark Cavage. All rights reserved.
// Copyright (c) 2014 Pedro Vieira.

var util = require('util');
var assert = require('assert-plus');
var restify = require('restify');
var exports = module.exports;


///--- Errors

/*
function MissingContentError () {
    restify.RestError.call(this, {
        statusCode: 409,
        restCode: 'MissingContent',
        message: 'This request must include a JSON object',
        constructorOpt: MissingContentError
    });

    this.name = 'MissingContentError';
}
util.inherits(MissingContentError, restify.RestError);
exports.MissingContentError = MissingContentError;
*/

/*
function AlreadyExistsError (name) {
    assert.string(name, 'name');

    restify.RestError.call(this, {
        statusCode: 409,
        restCode: 'AlreadyExists',
        message: 'Resource' + name + ' already exists',
        constructorOpt: AlreadyExistsError
    });

    this.name = 'AlreadyExistsError';
}
util.inherits(AlreadyExistsError, restify.RestError);
exports.AlreadyExistsError = AlreadyExistsError;
*/

/*
NotFoundError = function (name) {
    assert.string(name, 'name');

    restify.RestError.call(this, {
        statusCode: 404,
        restCode: 'NotFound',
        message: 'Resource ' + name + ' was not found',
        constructorOpt: NotFoundError
    });

    this.name = 'NotFoundError';
};
util.inherits(NotFoundError, restify.RestError);
exports.NotFoundError = NotFoundError;
*/
