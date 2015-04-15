// Test suite for VEGAPI sample api
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

test.create('Requests without authentication should fail')
  .get(URL + '/')
    .removeHeader('Authorization')
    .expectStatus(401)
    .expectHeaderContains('www-authenticate', 'realm="test"')
  .toss();

test.create('Requests with wrong authentication should fail')
  .get(URL + '/')
    .removeHeader('Authorization')
    .addHeader('Authorization', 'BASIC wrongstring')
    .expectStatus(401)
    .expectHeaderContains('www-authenticate', 'realm="test"')
  .toss();

test.create('Requests with correct authentication should succeed')
  .get(URL + '/')
    .expectStatus(200)
  .toss();

test.create('Requests for data in formats other than JSON should fail')
  .get(URL + '/')
    .removeHeader('Accept')
    .addHeader('Accept', 'text/html')
    .expectStatus(406)
  .toss();

