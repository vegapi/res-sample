// Test suite for VEGAPI sample api
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

test.create('Requests without authentication should fail')
  .get(URL + '/')
    .removeHeader('Authorization')
    .expectStatus(401)
    .expectHeaderContains('www-authenticate', 'realm=')
  .toss();

test.create('Requests with wrong authentication should fail')
  .get(URL + '/')
    .removeHeader('Authorization')
    .addHeader('Authorization', 'BASIC wrongstring')
    .expectStatus(401)
    .expectHeaderContains('www-authenticate', 'realm=')
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

