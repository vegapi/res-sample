// Copyright (c) 2012 Mark Cavage. All rights reserved.
// Copyright (c) 2014 Pedro Vieira.

var fs = require('fs');
var path = require('path');
var assert = require('assert-plus');
var bunyan = require('bunyan');
var errors = require('./errors');


///--- Handlers

/**
 * Note this handler looks in `req.params`, which means we can load request
 * parameters in a "mixed" way, like:
 *
 * POST /todo?name=foo HTTP/1.1
 * Host: localhost
 * Content-Type: application/json
 * Content-Length: ...
 *
 * {"task": "get milk"}
 *
 * Which would have `name` and `task` available in req.params
 */
function createTodo(req, res, next) {
    if (!req.params.task) {
        req.log.warn({params: p}, 'createTodo: missing content');
        next(new errors.MissingContentError());
        return;
    }

    var todo = {
        name: req.params.name || req.params.task.replace(/\W+/g, '_'),
        task: req.params.task
    };

    if (req.todos.indexOf(todo.name) !== -1) {
        req.log.warn('%s already exists', todo.name);
        next(new errors.AlreadyExistsError(todo.name));
        return;
    }

    var p = path.normalize(req.dir + '/' + todo.name);
    fs.writeFile(p, JSON.stringify(todo), function (err) {
        if (err) {
            req.log.warn(err, 'createTodo: unable to save');
            next(err);
        } else {
            req.log.debug({todo: todo}, 'createTodo: done');
            res.send(201, todo);
            next();
        }
    });
}


/**
 * Deletes a TODO by name
 */
function deleteTodo(req, res, next) {
    fs.unlink(req.todo, function (err) {
        if (err) {
            req.log.warn(err,
                'deleteTodo: unable to unlink %s',
                req.todo);
            next(err);
        } else {
            res.send(204);
            next();
        }
    });
}


/**
 * Simply checks that a todo on /todo/:name was loaded.
 * Requires loadTodos to have run.
 */
function ensureTodo(req, res, next) {
    assert.arrayOfString(req.todos, 'req.todos');

    if (req.params.name && req.todos.indexOf(req.params.name) === -1) {
        req.log.warn('%s not found', req.params.name);
        next(new errors.NotFoundError(req.params.name));
    } else {
        next();
    }
}


/**
 * Loads a TODO by name
 *
 * Requires `loadTodos` to have run.
 *
 * Note this function uses streaming, as that seems to come up a lot
 * on the mailing list and issue board.  restify lets you use the HTTP
 * objects as they are in "raw" node.
 *
 * Note by using the "raw" node APIs, you'll need to handle content
 * negotiation yourself.
 *
 */
function getTodo(req, res, next) {
    if (req.accepts('json')) {
        var fstream = fs.createReadStream(req.todo);

        fstream.once('open', function onOpen() {
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            fstream.pipe(res);
            fstream.once('end', next);
        });

        // Really, you'd want to disambiguate the error code
        // from 'err' here to return 403, 404, etc., but this
        // is just a demo, so you get a 500
        fstream.once('error', next);
        return;
    }

    fs.readFile(req.todo, 'utf8', function (err, data) {
        if (err) {
            req.log.warn(err, 'get: unable to read %s', req.todo);
            next(err);
            return;
        }

        res.send(200, JSON.parse(data));
        next();
    });
}


/**
 * Loads up all the stored TODOs from our "database". Most of the downstream
 * handlers look for these and do some amount of enforcement on what's there.
 */
function loadTodos(req, res, next) {
    fs.readdir(req.dir, function (err, files) {
        if (err) {
            req.log.warn(err,
                'loadTodo: unable to read %s',
                req.dir);
            next(err);
        } else {
            req.todos = files;

            if (req.params.name)
                req.todo = req.dir + '/' + req.params.name;

            req.log.debug({
                todo: req.todo,
                todos: req.todos
            }, 'loadTODO: done');

            next();
        }
    });
}


/**
 * Simple returns the list of TODOs that were loaded.
 * This requires loadTodo to have run already.
 */
function listTodos(req, res, next) {
    assert.arrayOfString(req.todos, 'req.todos');

    res.send(200, req.todos);
    next();
}


/**
 * Replaces a TODO completely
 */
function putTodo(req, res, next) {
    if (!req.params.task) {
        req.log.warn({params: req.params}, 'putTodo: missing content');
        next(new errors.MissingContentError());
        return;
    }

    // Force the name to be what we sent this to
    var todo = {
        name: req.params.name,
        task: req.params.task
    };

    fs.writeFile(req.todo, JSON.stringify(req.body), function (err) {
        if (err) {
            req.log.warn(err, 'putTodo: unable to save');
            next(err);
        } else {
            req.log.debug({todo: req.body}, 'putTodo: done');
            res.send(204);
            next();
        }
    });
}

module.exports = {
    createTodo: createTodo,
    listTodos: listTodos,
    ensureTodo: ensureTodo,
    getTodo: getTodo,
    putTodo: putTodo,
    deleteTodo: deleteTodo,
    loadTodos: loadTodos
};

