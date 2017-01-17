module.exports = function(app){
	/* GET mis clases view page. */
	app.get('/misclases', function(req, res, next) {
	  res.render('misclases', { title: 'Mis clases' });
	});
}