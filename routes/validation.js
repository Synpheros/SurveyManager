module.exports = function(app){
	app.get('/validate', function(req, res, next) {
		
		
		res.render('index', { title: 'validation' });
	});
}