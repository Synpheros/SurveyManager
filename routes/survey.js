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

	app.get('/validate', function(req, res, next) {
		if(!req.query.survey)
			return next(new Error("Unknown survey"));

		if(!req.query.token)
			return next(new Error("Unknown token"));

		var sid = req.query.survey;
		var token = req.query.token;
		var survey = [];
		var tid = [];

		async.waterfall([
			surveyLib.limesurveyAuthentication,
			surveyLib.getSurvey(sid,survey),
			surveyLib.checkSurveyStarted(survey),
			surveyLib.checkSurveyToken(sid,token,tid)
		], function (err, result) {
			if(err)
				return next(new Error(result));
			res.json({message: "Token "+token+" exists for survey "+sid});
		});
	});

	app.get('/completed', function(req, res, next) {
		if(!req.query.survey)
			return next(new Error("Unknown survey"));

		if(!req.query.token)
			return next(new Error("Unknown token"));

		var sid = req.query.survey;
		var token = req.query.token;
		var survey = [];
		var tid = [];
		var rid = [];

		async.waterfall([
			surveyLib.limesurveyAuthentication,
			surveyLib.getSurvey(sid,survey),
			surveyLib.checkSurveyStarted(survey),
			surveyLib.checkSurveyToken(sid,token,tid),
			surveyLib.getResponseId(sid,token,rid),
			surveyLib.tokenHasCompleted(sid,token,rid)
		], function (err, result) {
			if(err)
				return next(new Error(result));
			res.json({message: "Token "+token+" completed survey "+sid});
		});
	});

	app.get('/survey/:survey', function(req, res, next) {
		var token = req.query.token;
		var survey = req.params.survey;
		var url = 'http://polls.e-ucm.es/index.php/' + survey + '?token=' + token;
		res.writeHead(301,{Location: url});
		res.end();
		//res.redirect("http://polls.e-ucm.es/index.php/" + survey + "?token=" + token);
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
			surveyLib.creaSurvey(req.files.post, 'post', list),
			surveyLib.registraSurveys(req.db, userName, req.body.surveysname, list),
			surveyLib.muestraEncuestas(req.db, userName)
		], function (err, result) {
			res.redirect('misencuestas');
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
			surveyLib.altaAlumnos(clase,encuesta),
			surveyLib.registraClaseEncuesta(db, clase, encuesta)
		], function (err, result) {
			if (err) {
				console.log("Error en el registro de clase y encuesta")
			}
			res.redirect('misencuestas');
		});
	});
}
