module.exports = function(app,options){

	var request = require('request');
	var async = require('async');


	var user = 'admin';
	var pass = '123456';

	var claseLib = require('../lib/clase');
	var surveyLib = require('../lib/survey');
	surveyLib.setOptions(options);
	surveyLib.setUser(user,pass);

	//###################################################
	//################## ALTAENCUESTA ###################
	//###################################################

	/* GET alta encuesta */
	app.get('/altaencuesta', function(req, res, next) {
		res.render('altaencuesta', { title: 'Alta encuesta' });
	});

	/* POST to alta encuesta */
	app.post('/altaencuesta', function(req, res) {
		var pre, post;

		if (!req.files) {
			res.send('No files were uploaded.');
			return;
		}
		var list = [];
		async.waterfall([
			surveyLib.creaSurvey(req.files.pre, 'pre', list),
			surveyLib.creaSurvey(req.files.post, 'post', list)
		], function (err, result) {
			surveyLib.registraSurveys(res, req.db, userName, req.body.surveysname, list);
		});
	});

	//###################################################
	//################## MISENCUESTAS ###################
	//###################################################

	/* GET to mis encuestas */
	app.get('/misencuestas', function(req, res) {
		var encuestas = [], clases = [];
		var db = req.db;

		async.waterfall([
			surveyLib.cargaEncuestas(db, userName, encuestas),
			claseLib.cargaClases(db, userName, clases),
			
		], function (err, result) {
			res.render('misencuestas', {numencuestas: encuestas.lenght, encuestas: encuestas, clases: clases});
		});
	});




	/* POST to mis encuestas */
	app.post('/misencuestas', function(req, res) {
		var clase = {clase : "", numalumnos: "", codigos: []};
		var encuesta = {nombreencuesta : "", pre: "", post: "", clases: []};
		var db = req.db;

		async.waterfall([
			claseLib.cargaClase(db, req.body.claseseleccionada, clase),
			surveyLib.cargaEncuesta(db, req.body.encuesta, encuesta),
			surveyLib.limesurveyAuthentication,
			surveyLib.altaAlumnos(clase,encuesta)
		], function (err, result) {
			if (err) {
				console.log("Error en el registro de clase y encuesta")
			}
			else 
				surveyLib.registraClaseEncuesta(db, clase, encuesta);
			//$dummy = array("email"=>"dummy@dummy.dum","firstname"=>"dummy","lastname"=>"dummy");
			//res.render('claseencuesta', {clase : result.clase, numalumnos: result.numalumnos, codigos: result.codigos})
		});
	});
}
