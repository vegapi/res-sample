// Test suite for VEGAPI - companies
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

test.create('Initial request for / should return an empty list of companies')
  .get(URL + '/')
  .expectStatus(200)
  .expectHeaderContains('Content-Type', 'application/json')
  .expectJSONTypes({
    _data: Array,
    _links: Object
  })
  .expectJSON({
    _data: [],
    _links: {
      _self: '/'
    }
  })
  .toss();

test.create('Request to create new company without content should fail')
  .post(URL + '/')
  .expectStatus(400)
  .expectJSON({
    code: 'InvalidContent'
  })
  .toss();

test.create('Request to create new company with empty=true flag should create a resource with _status="empty')
  .post(URL + '/?empty=true', {}, {json: true})
  .expectStatus(201)
  .expectHeaderContains('Location', '/')
  .expectJSON({
    _data: {},
    _status: "empty"
  })
  .toss();
  
var data = 'nonJSONdata';
test.create('Request to create company with wrong content-type should fail')
  .post(URL + '/', data, {json: true})
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
test.create('Request to create company without required attributes should fail')
  .post(URL + '/', wrongContent, {json: true})
  .expectStatus(400)
  .expectJSON({
    code: 'InvalidContent'
  })
  .toss();

var companyJSONType = require('../resources/companyType');
var company1 = require('../resources/company1');
var company2 = require('../resources/company2');

test.create('Request to create company with valid attributes should succeed')
  .post(URL + '/', company1, {json: true})
  .expectStatus(201)
  .expectHeaderContains('Location', '/')
  .expectJSONTypes(companyJSONType)
  .expectJSON({
    _data: company1._data,
    _status: 'active'
  })
  .afterJSON(function (comp) {

    test.create('Request for / should return a list with active companies')
      .get(URL + '/')
      .expectStatus(200)
      .expectJSONTypes({
        _data: [{
          _name: String,
          _id: String
        }],
        _links: Object
      })
      .expectJSON('_data.?', {
        _name: comp._data._name,
        _id: comp._id
        })
    .toss();

    test.create('Request for /?name="My Company" should return a list with company of that name')
      .get(URL + '/?name=My Company')
      .expectStatus(200)
      .expectJSONTypes({
        _data: [{
          _name: String,
          _id: String
        }],
        _links: Object
      })
      .expectJSON('_data.?', {
        _name: "My Company",
        _id: comp._id
        })
      .expectJSON({
        _links: {
          _self: '/?name=My%20Company'
        }
      })
    .toss();

    test.create('Request for /?name="Other Company" should return an empty list')
      .get(URL + '/?name=Other Company')
      .expectStatus(200)
      .expectJSONTypes({
        _data: Array,
        _links: Object
      })
      .expectJSON({
        _data: [],
        _links: {
          _self: '/?name=Other%20Company'
        }
  })
    .toss();

    test.create('Request to read an active company should succeed')
      .get(URL + comp._id)
      .expectStatus(200)
      .expectJSONTypes(companyJSONType)
      .expectJSON({
        _id: comp._id,
	      _data: company1._data,
        _status: 'active',
        _lastModifiedDate: comp._lastModifiedDate,
        _links: comp._links
      })
      .toss();

    test.create('Request to update an active company using valid attributes should succeed')
      .put(URL + comp._id, company2, {json: true})
      .expectStatus(200)
      .expectJSONTypes(companyJSONType)
      .expectJSON({
        _id: comp._id,
        _data: company2._data,
        _status: 'active',
        _links: comp._links
      })
    .toss();

    test.create('Request to delete an active company should succeed')
      .delete(URL + comp._id)
      .expectStatus(204)
      .after(function () {

        test.create('Request for / should return a list without deleted companies')
          .get(URL + '/')
          .expectStatus(200)
          .expectJSON({
            _data: [],
            _links: {
              _self: '/'
            }
          })
          .toss();

        test.create('Request to read a deleted company should fail')
          .get(URL + comp._id)
          .expectStatus(410)
          .toss();

      })
      .toss();
  })
  .toss();

