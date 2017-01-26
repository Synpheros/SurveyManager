﻿module.exports = function(app){

	process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
	
	var options = {
		url: 'https://' + app.config.limesurveyUrl + '/index.php/admin/remotecontrol',
		method: "POST",
		headers: {
			'user-agent': 'Apache-HttpClient/4.2.2 (java 1.5)',
	    	'host': app.config.limesurveyUrl,
	    	'path': '/index.php/admin/remotecontrol',
	    	'connection': 'keep-alive',
	    	'content-type': 'application/json'
	  	}
	};

    var auth = function(req, res, next) {
	  if (req.session && req.session.user)
	    return next();
	  else
	    return res.redirect('/users/login');
	};

	var express = require('express'),
    router = express.Router();

    router.get('/', auth, function(req, res, next) {
		res.render('index', { title: 'Home' });
	});

    app.use('/', router);

	app.use('/users', require('./user.js')(auth));
	app.use('/classes', require('./clase.js')(auth));
	app.use('/surveys', require('./survey.js')(auth, options));

}
