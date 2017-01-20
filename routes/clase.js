module.exports = function(auth){

	var express = require('express'),
    router = express.Router();
	/* GET mis clases view page. */
	router.get('/misclases', function(req, res, next) {
	  res.render('misclases', { title: 'Mis clases' });
	});

	return router;
}