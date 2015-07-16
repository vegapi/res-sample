// Test suite for VEGAPI - items
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
var item1 = require('../resources/item1');
var item2 = require('../resources/item2');

test.create('Create a company to support item tests')
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

    test.create('Initial request for {companyId}/items should return an empty list of items')
      .get(URL + '/' + comp._id + '/items')
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
          _self: comp._id + '/items'
        }
      })
      .toss();

    test.create('Request to create new item without content should fail')
      .post(URL + '/' + comp._id + '/items')
      .expectStatus(400)
      .expectJSON({
        code: 'InvalidContent'
      })
      .toss();

    test.create('Request to create new item with an empty body should create a resource with _status=empty')
      .post(URL + comp._id + '/items', {}, {json: true})
      .expectStatus(201)
      .expectJSON({
        _data: {},
        _status: "empty"
      })
      .toss();
  
    var data = 'nonJSONdata';
    test.create('Request to create item with wrong content-type should fail')
      .post(URL + '/' + comp._id + '/items', data, {json: true})
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
    test.create('Request to create item without required attributes should fail')
      .post(URL + '/' + comp._id + '/items', wrongContent, {json: true})
      .expectStatus(400)
      .expectJSON({
        code: 'InvalidContent'
      })
      .toss();

    test.create('Request to create item with valid attributes should succeed')
      .post(URL + '/' + comp._id + '/items', item1, {json: true})
      .expectStatus(201)
      .expectHeaderContains('Location', comp._id + '/items')
      .expectJSON({
        _data: item1._data,
        _status: 'active'
      })
      .afterJSON(function (itm) {

        test.create('Request for company items should return a list with all its active items')
          .get(URL + '/' + comp._id + '/items')
          .expectStatus(200)
          .expectJSONTypes({
            _data: [{
              _name: String,
              _id: String
            }],
            _links: Object
          })
          .expectJSON('_data.?', {
            _name: itm._data._name,
            _id: itm._id
            })
          .toss();

        test.create('Request for items filtered by name should return a list with all items with that name')
          .get(URL + '/' + comp._id + '/items?name=' + itm._data._name)
          .expectStatus(200)
          .expectJSONTypes({
            _data: [{
              _name: String,
              _id: String
            }],
            _links: Object
          })
          .expectJSON('_data.?', {
            _name: itm._data._name
            })
          .expectJSON({
            _links: {
            _self: comp._id + '/items?name=' + encodeURI(itm._data._name)
            }
          })
          .toss();

        test.create('Request for items filtered by a tag should return a list with all items with that tag')
          .get(URL + '/' + comp._id + '/items?tag=' + itm._data._tags[0])
          .expectStatus(200)
          .expectJSONTypes({
            _data: [{
              _name: String,
              _id: String
            }],
            _links: Object
          })
          .expectJSON('_data.?', {
            _name: itm._data._name
          })
          .expectJSON({
            _links: {
            _self: comp._id + '/items?tag=' + encodeURI(itm._data._tags[0])
            }
          })
          .toss();

        test.create('Request for items filtered by a tag should return an empty list if no item exists with that tag')
          .get(URL + '/' + comp._id + '/items?tag=Something')
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
              _self: comp._id + '/items?tag=Something'
            }
          })
          .toss();

        test.create('Request to read an active item should succeed')
          .get(URL + itm._id)
          .expectStatus(200)
          .expectJSON({
            _id: itm._id,
            _data: itm._data,
            _status: 'active',
            _lastModifiedDate: itm._lastModifiedDate,
            _links: itm._links
          })
          .toss();

        test.create('Request to update an active item using valid attributes should succeed')
          .put(URL + itm._id, item2, {json: true})
          .expectStatus(200)
          //.expectJSONTypes(documentJSONType)
          .expectJSON({
            _id: itm._id,
            _data: item2._data,
            _links: itm._links
          })
          .toss();

        test.create('Request to delete an active item should succeed')
          .delete(URL + itm._id)
          .expectStatus(204)
          .after(function () {

            test.create('Request for {companyId}/items should return a list without deleted entities')
              .get(URL + '/' + comp._id + '/entities')
              .expectStatus(200)
              .expectJSON({
                _data: [],
                _links: {
                  _self: comp._id + '/entities'
                }
              })
              .toss();

            test.create('Request to read a deleted item should fail')
              .get(URL + itm._id)
              .expectStatus(410)
              .toss();
          })
          .toss();
      })
      .toss();
  })
  .toss();
