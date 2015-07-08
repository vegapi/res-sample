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
var profile1 = require('../resources/profile1');
var profile2 = require('../resources/profile2');

test.create('Create a company to support profile tests')
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

    test.create('Initial request for {companyId}/profiles should return an empty list of profiles')
      .get(URL + '/' + comp._id + '/profiles')
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
          _self: comp._id + '/profiles'
        }
      })
      .toss();

    test.create('Request to create new profile without content should fail')
      .post(URL + '/' + comp._id + '/profiles')
      .expectStatus(400)
      .expectJSON({
        code: 'InvalidContent'
      })
      .toss();

    test.create('Request to create new profile with an empty body should create a resource with _status=empty')
      .post(URL + '/' + comp._id + '/profiles', {}, {json: true})
      .expectStatus(201)
      .expectJSON({
        _data: {},
        _status: "empty"
      })
      .toss();
  
    var data = 'nonJSONdata';
    test.create('Request to create profile with wrong content-type should fail')
      .post(URL + '/' + comp._id + '/profiles', data, {json: true})
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
    test.create('Request to create profile without required attributes should fail')
      .post(URL + '/' + comp._id + '/profiles', wrongContent, {json: true})
      .expectStatus(400)
      .expectJSON({
        code: 'InvalidContent'
      })
      .toss();

    test.create('Request to create profile with valid attributes should succeed')
      .post(URL + '/' + comp._id + '/profiles', profile1, {json: true})
      .expectStatus(201)
      .expectHeaderContains('Location', comp._id+'/profiles/')
      .expectJSON({
        _data: profile1._data,
        _status: 'active'
      })
      .afterJSON(function (pro) {

        test.create('Request for company profiles should return a list with all its active profiles')
          .get(URL + '/' + comp._id + '/profiles')
          .expectStatus(200)
          .expectJSONTypes({
            _data: [{
              _name: String,
              _id: String
            }],
            _links: Object
          })
          .expectJSON('_data.?', {
            _name: pro._data._name,
            _id: pro._id
            })
          .toss();

        test.create('Request for profiles filtered by name should return a list with all profiles with that name')
          .get(URL + '/' + comp._id + '/profiles?name=Profile1')
          .expectStatus(200)
          .expectJSONTypes({
            _data: [{
              _name: String,
              _id: String
            }],
            _links: Object
          })
          .expectJSON('_data.?', {
            _name: "Profile1"
            })
          .expectJSON({
            _links: {
            _self: comp._id + '/profiles?name=Profile1'
            }
          })
          .toss();

        test.create('Request for profiles filtered by name should return an empty list if no profile exists with that name')
          .get(URL + '/' + comp._id + '/profiles?name=Abcd')
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
              _self: comp._id + '/profiles?name=Abcd'
            }
          })
          .toss();

        test.create('Request to read an active profile should succeed')
          .get(URL + pro._id)
          .expectStatus(200)
          .expectJSON({
            _id: pro._id,
            _data: pro._data,
            _status: 'active',
            _lastModifiedDate: pro._lastModifiedDate,
            _links: pro._links
          })
          .toss();

        test.create('Request to update an active profile using valid attributes should succeed')
          .put(URL + pro._id, profile2, {json: true})
          .expectStatus(200)
          .expectJSON({
            _id: pro._id,
            _data: profile2._data,
            _links: pro._links
          })
          .toss();

        test.create('Request to delete an active profile should succeed')
          .delete(URL + pro._id)
          .expectStatus(204)
          .after(function () {

            test.create('Request for a profile list should return a list without deleted profiles')
              .get(URL + '/' + comp._id + '/profiles')
              .expectStatus(200)
              .expectJSON({
                _data: [],
                _links: {
                  _self: comp._id + '/profiles'
                }
              })
              .toss();

            test.create('Request to read a deleted profile should fail')
              .get(URL + pro._id)
              .expectStatus(410)
              .toss();
          })
          .toss();
      })
      .toss();
  })
  .toss();
