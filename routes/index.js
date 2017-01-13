var express = require('express');
var fileUpload = require('express-fileupload');
var request = require('request');
var async = require('async');

var app = express();
app.use(fileUpload());

var user = 'admin';
var pass = '123456';
var SESSIONKEY="";

var options = {
	url: "http://localhost/limesurvey/index.php/admin/remotecontrol",
	method: "POST",
	headers: {
		'user-agent': 'Apache-HttpClient/4.2.2 (java 1.5)',
    	'host': '192.168.175.106',
    	'path': '/limesurvey/index.php/admin/remotecontrol',
    	'connection': 'keep-alive',
    	'content-type': 'application/json'
  	}
};

require('./user.js')(app);
require('./clase.js')(app);
require('./survey.js')(app);


module.exports = app;
