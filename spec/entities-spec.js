// Test suite for VEGAPI - entitiess
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
var entity1 = require('../resources/entity1');
var entity2 = require('../resources/entity2');

test.create('Create a company to support entity tests')
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

    test.create('Initial request for {companyId}/entities should return an empty list of entities')
      .get(URL + '/' + comp._id + '/entities')
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
          _self: comp._id + '/entities'
        }
      })
      .toss();

    test.create('Request to create new entity without content should fail')
      .post(URL + '/' + comp._id + '/entities')
      .expectStatus(400)
      .expectJSON({
        code: 'InvalidContent'
      })
      .toss();

    test.create('Request to create new entity with an empty body should create a resource with _status=empty')
      .post(URL + comp._id + '/entities', {}, {json: true})
      .expectStatus(201)
      .expectJSON({
        _data: {},
        _status: "empty"
      })
      .toss();
  
    var data = 'nonJSONdata';
    test.create('Request to create entity with wrong content-type should fail')
      .post(URL + '/' + comp._id + '/entities', data, {json: true})
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
    test.create('Request to create entity without required attributes should fail')
      .post(URL + '/' + comp._id + '/entities', wrongContent, {json: true})
      .expectStatus(400)
      .expectJSON({
        code: 'InvalidContent'
      })
      .toss();

    test.create('Request to create entity with valid attributes should succeed')
      .post(URL + '/' + comp._id + '/entities', entity1, {json: true})
      .expectStatus(201)
      .expectHeaderContains('Location', comp._id+'/entities/')
      .expectJSON({
        _data: entity1._data,
        _status: 'active'
      })
      .afterJSON(function (ent) {

        test.create('Request for company entities should return a list with all its active entities')
          .get(URL + '/' + comp._id + '/entities')
          .expectStatus(200)
          .expectJSONTypes({
            _data: [{
              _name: String,
              _id: String
            }],
            _links: Object
          })
          .expectJSON('_data.?', {
            _name: ent._data._name,
            _id: ent._id
            })
          .toss();

        test.create('Request for entities filtered by name should return a list with all entities with that name')
          .get(URL + '/' + comp._id + '/entities?name=' + ent._data._name)
          .expectStatus(200)
          .expectJSONTypes({
            _data: [{
              _name: String,
              _id: String
            }],
            _links: Object
          })
          .expectJSON('_data.?', {
            _name: ent._data._name
            })
          .expectJSON({
            _links: {
            _self: comp._id + '/entities?name=' + ent._data._name
            }
          })
          .toss();

        test.create('Request for entities filtered by a tag should return a list with all entities with that tag')
          .get(URL + '/' + comp._id + '/entities?tag=' + ent._data._tags[0])
          .expectStatus(200)
          .expectJSONTypes({
            _data: [{
              _name: String,
              _id: String
            }],
            _links: Object
          })
          .expectJSON('_data.?', {
            _name: ent._data._name
          })
          .expectJSON({
            _links: {
            _self: comp._id + '/entities?tag=' + ent._data._tags[0]
            }
          })
          .toss();

        test.create('Request for entities filtered by a tag should return an empty list if no entity exists with that tag')
          .get(URL + '/' + comp._id + '/entities?tag=Something')
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
              _self: comp._id + '/entities?tag=Something'
            }
          })
          .toss();

        test.create('Request to read an active entity should succeed')
          .get(URL + ent._id)
          .expectStatus(200)
          .expectJSON({
            _id: ent._id,
            _data: ent._data,
            _status: 'active',
            _lastModifiedDate: ent._lastModifiedDate,
            _links: ent._links
          })
          .toss();

        test.create('Request to update an active entity using valid attributes should succeed')
          .put(URL + doc._id, entity2, {json: true})
          .expectStatus(200)
          //.expectJSONTypes(documentJSONType)
          .expectJSON({
            _id: ent._id,
            _data: entity2._data,
            _links: ent._links
          })
          .toss();

        test.create('Request to delete an active entity should succeed')
          .delete(URL + ent._id)
          .expectStatus(204)
          .after(function () {

            test.create('Request for {companyId}/entities should return a list without deleted entities')
              .get(URL + '/' + comp._id + '/entities')
              .expectStatus(200)
              .expectJSON({
                _data: [],
                _links: {
                  _self: comp._id + '/entities'
                }
              })
              .toss();

            test.create('Request to read a deleted entity should fail')
              .get(URL + ent._id)
              .expectStatus(410)
              .toss();
          })
          .toss();
      })
      .toss();
  })
  .toss();
