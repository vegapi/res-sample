// Test suite for VEGAPI - users
//
var test = require('frisby');
var app = process.env.VG_APP;
var host = (app || 'sample') + '.vegapi.org:' + (parseInt(process.env.VG_PORT, 10) || 8080);
var URL = 'http://' + host;
var auth = '';
if (app) {
  auth = new Buffer(app + ':' + process.env.VG_KEY).toString('base64');
}

test.globalSetup({
  request: {
    headers: {
      'Host': host,
      'Authorization': 'BASIC ' + auth,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
});

var company = require('../resources/company1');
var user1 = require('../resources/user1');
var user2 = require('../resources/user2');

test.create('Create a company to support user tests')
  .post(URL + '/', company, {json: true})
  .expectStatus(201)
  .expectHeaderContains('Location', '/')
  .expectJSON({
    _data: {
      _name: company._data._name,
      _description: company._data._description,
      _taxNumber: company._data._taxNumber,
      _earliestVatDate: company._data._earliestVatDate,
      _earliestAccountingDate: company._data._earliestAccountingDate
    },
    _status: 'active'
  })
  .afterJSON(function (comp) {

    test.create('Initial request for {companyId}/users should return an empty list of users')
      .get(URL + '/' + comp._id + '/users')
      .expectStatus(200)
      .expectHeaderContains('Content-Type', 'application/json')
      .expectJSONTypes({
        _data: [{
          _name: String,
          _id: String
        }],
        _links: {
          _self: String
        }
      })
      .expectJSON({
        _data: [],
        _links: {
          _self: comp._id + '/users'
        }
      })
      .toss();

    test.create('Request to create new user without content should fail')
      .post(URL + '/' + comp._id + '/users')
      .expectStatus(400)
      .expectJSON({
        code: 'InvalidContent'
      })
      .toss();

    test.create('Request to create new user with an empty body should create a resource with _status=empty')
      .post(URL + comp._id + '/users', {}, {json: true})
      .expectStatus(201)
      .expectJSON({
        _data: {},
        _status: "empty"
      })
      .toss();
  
    var data = 'nonJSONdata';
    test.create('Request to create user with wrong content-type should fail')
      .post(URL + '/' + comp._id + '/users', data, {json: true})
      .removeHeader('Content-Type')
      .addHeader('Content-Type', 'text/html')
      .expectStatus(400)
      .expectJSON({
        code: 'InvalidContent'
      })
      .toss();

    var wrongContent = {
      _data: {
        _name: 'thing'
      }
    };
    test.create('Request to create user without required attributes should fail')
      .post(URL + '/' + comp._id + '/users', wrongContent, {json: true})
      .expectStatus(400)
      .expectJSON({
        code: 'InvalidContent'
      })
      .toss();

    test.create('Request to create user with valid attributes should succeed')
      .post(URL + '/' + comp._id + '/users', user1, {json: true})
      .expectStatus(201)
      .expectHeaderContains('Location', comp._id+'/users/')
      .expectJSON({
        _data: user1._data,
        _status: 'active'
      })
      .afterJSON(function (usr) {

        test.create('Request for company users should return a list with all its active users')
          .get(URL + '/' + comp._id + '/users')
          .expectStatus(200)
          .expectJSONTypes({
            _data: [{
              _name: String,
              _id: String
            }],
            _links: Object
          })
          .expectJSON('_data.?', {
            _name: usr._data._name,
            _id: usr._id
            })
          .toss();

        test.create('Request for users filtered by name should return a list with all users with that name')
          .get(URL + '/' + comp._id + '/users?name=User1')
          .expectStatus(200)
          .expectJSONTypes({
            _data: [{
              _name: String,
              _id: String
            }],
            _links: Object
          })
          .expectJSON('_data.?', {
            _name: "User1"
            })
          .expectJSON({
            _links: {
            _self: comp._id + '/users?name=User1'
            }
          })
          .toss();

        test.create('Request for users filtered by name should return an empty list if no document exists with that name')
          .get(URL + '/' + comp._id + '/users?name=User99')
          .expectStatus(200)
          .expectJSONTypes({
            _data: [{
              _name: String,
              _id: String
            }],
            _links: Object
          })
          .expectJSON({
            _data: [],
            _links: {
              _self: comp._id + '/users?name=User99'
            }
          })
          .toss();

        test.create('Request to read an active user should succeed')
          .get(URL + usr._id)
          .expectStatus(200)
          .expectJSON({
            _id: usr._id,
            _data: usr._data,
            _status: 'active',
            _lastModifiedDate: usr._lastModifiedDate,
            _links: usr._links
          })
          .toss();

        test.create('Request to update an active user using valid attributes should succeed')
          .put(URL + usr._id, user2, {json: true})
          .expectStatus(200)
          .expectJSON({
            _id: usr._id,
            _data: user2._data,
            _status: 'active',
            _links: usr._links
          })
          .toss();

        test.create('Request to delete an active user should succeed')
          .delete(URL + usr._id)
          .expectStatus(204)
          .after(function () {

            test.create('Request for / should return a list without deleted users')
              .get(URL + '/' + comp._id + '/users')
              .expectStatus(200)
              .expectJSON({
                _data: [],
                _links: {
                  _self: comp._id + '/users'
                }
              })
              .toss();

            test.create('Request to read a deleted user should fail')
              .get(URL + usr._id)
              .expectStatus(410)
              .toss();
          })
          .toss();
      })
      .toss();
  })
  .toss();
