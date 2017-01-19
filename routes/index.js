var express = require('express');
var fileUpload = require('express-fileupload');
var config = require('../config');

var app = express();
app.use(fileUpload());

var options = {
	url: 'http://' + config.limesurveyUrl + '/index.php/admin/remotecontrol',
	method: "POST",
	headers: {
		'user-agent': 'Apache-HttpClient/4.2.2 (java 1.5)',
    	'host': config.limesurveyUrl,
    	'path': '/index.php/admin/remotecontrol',
    	'connection': 'keep-alive',
    	'content-type': 'application/json'
  	}
};

var user = require('./user.js')(app);
var clase = require('./clase.js')(app);
var survey = require('./survey.js')(app,options);


module.exports = app;
