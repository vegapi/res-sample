// Test suite for VEGAPI - documents
//
var test = require('frisby');
var URL = 'http://test.vegapi.org:8080';

test.globalSetup({
  request: {
    headers: {
      'Host': 'test.vegapi.org:8080',
      'Authorization': 'BASIC dGVzdDpjaGF2ZQ==',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  }
});

var company = require('../resources/company1');
var document3 = require('../resources/document3');
var document4 = require('../resources/document4');

test.create('Create a company to support document tests')
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

    test.create('Initial request for {companyId}/documents should return an empty list of documents')
      .get(URL + '/' + comp._id + '/documents')
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
          _self: comp._id + '/documents'
        }
      })
      .toss();

    test.create('Request to create new document without content should fail')
      .post(URL + '/' + comp._id + '/documents')
      .expectStatus(400)
      .expectJSON({
        code: 'InvalidContent'
      })
      .toss();

    test.create('Request to create new document with empty=true flag should create a resource with _status=empty')
      .post(URL + comp._id + '/documents?empty=true', {}, {json: true})
      .expectStatus(201)
      .expectJSON({
        _data: {},
        _status: "empty"
      })
      .toss();
  
    var data = 'nonJSONdata';
    test.create('Request to create document with wrong content-type should fail')
      .post(URL + '/' + comp._id + '/documents', data, {json: true})
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
    test.create('Request to create document without required attributes should fail')
      .post(URL + '/' + comp._id + '/documents', wrongContent, {json: true})
      .expectStatus(400)
      .expectJSON({
        code: 'InvalidContent'
      })
      .toss();

    test.create('Request to create document with valid attributes should succeed')
      .post(URL + '/' + comp._id + '/documents', document3, {json: true})
      .expectStatus(201)
      .expectHeaderContains('Location', comp._id+'/documents/')
      .expectJSON({
        _data: document3._data,
        _status: 'active'
      })
      .afterJSON(function (doc) {

        test.create('Request for company documents should return a list with all its active documents')
          .get(URL + '/' + comp._id + '/documents')
          .expectStatus(200)
          .expectJSONTypes({
            _data: [{
              _name: String,
              _id: String
            }],
            _links: Object
          })
          .expectJSON('_data.?', {
            _name: doc._data._name,
            _id: doc._id
            })
          .toss();

        test.create('Request for documents filtered by name should return a list with all documents with that name')
          .get(URL + '/' + comp._id + '/documents?name=FC 2014/227')
          .expectStatus(200)
          .expectJSONTypes({
            _data: [{
              _name: String,
              _id: String
            }],
            _links: Object
          })
          .expectJSON('_data.?', {
            _name: "FC 2014/227"
            })
          .expectJSON({
            _links: {
            _self: comp._id + '/documents?name=FC%202014%2F227'
            }
          })
          .toss();

        test.create('Request for documents filtered by entity should return a list with all documents with that entity name')
          .get(URL + '/' + comp._id + '/documents?entity=A Customer')
          .expectStatus(200)
          .expectJSONTypes({
            _data: [{
              _name: String,
              _id: String
            }],
            _links: Object
          })
          .expectJSON('_data.?', {
            _name: "FC 2014/227"
          })
          .expectJSON({
            _links: {
            _self: comp._id + '/documents?entity=A%20Customer'
            }
          })
          .toss();

        test.create('Request for documents filtered by entity should return an empty list if no document exists with that entity name')
          .get(URL + '/' + comp._id + '/documents?entity=Other Customer')
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
              _self: comp._id + '/documents?entity=Other%20Customer'
            }
          })
          .toss();

        test.create('Request to read an active document should succeed')
          .get(URL + doc._id)
          .expectStatus(200)
          .expectJSON({
            _id: doc._id,
            _data: doc._data,
            _status: 'active',
            _lastModifiedDate: doc._lastModifiedDate,
            _links: doc._links
          })
          .toss();

        test.create('Request to update an active document using valid attributes should succeed')
          .put(URL + doc._id, document4, {json: true})
          .expectStatus(200)
          //.expectJSONTypes(documentJSONType)
          .expectJSON({
            _id: doc._id,
            _data: document4._data,
            _links: doc._links
          })
          .toss();

        test.create('Request to delete an active document should succeed')
          .delete(URL + doc._id)
          .expectStatus(204)
          .after(function () {

            test.create('Request for / should return a list without deleted documents')
              .get(URL + '/' + comp._id + '/documents')
              .expectStatus(200)
              .expectJSON({
                _data: [],
                _links: {
                  _self: comp._id + '/documents'
                }
              })
              .toss();

            test.create('Request to read a deleted document should fail')
              .get(URL + doc._id)
              .expectStatus(410)
              .toss();
          })
          .toss();
      })
      .toss();
  })
  .toss();
