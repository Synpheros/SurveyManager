module.exports = function(app){

	if(!app.config.limesurveyUrl.includes('80')){
		console.log("--SECURE MODE--");
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
		prefix = 'https://';
	}else
		prefix = 'http://';
	
	var options = {
		url: prefix + app.config.limesurveyUrl + '/index.php/admin/remotecontrol',
		method: "POST",
		headers: {
			'user-agent': 'Apache-HttpClient/4.2.2 (java 1.5)',
	    	'host': app.config.limesurveyUrl,
	    	'path': '/index.php/admin/remotecontrol',
	    	'connection': 'keep-alive',
	    	'content-type': 'application/json'
	  	}
	};

    var auth = function(level){
		return function(req, res, next) {
			if (req.session && req.session.user)
				return next();
			else{
				var pre = '';
				for(var i = 0; i < level; i++){
					pre += '../';
				}
				return res.redirect(pre + 'users/login');
			}
		};
	};

	var express = require('express'),
    router = express.Router();

    router.get('/', auth(0), function(req, res, next) {
		res.redirect('users/teacherview');
	});

    app.use('/', router);

	app.use('/users', require('./user.js')(auth(1)));
	app.use('/classes', require('./clase.js')(auth, options));
	app.use('/surveys', require('./survey.js')(auth, options));

}
