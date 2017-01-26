module.exports = function(auth, options){

	var express = require('express'),
    router = express.Router();

	var request = require('request');
	var async = require('async');


	var user = 'admin';
	var pass = '123456';

	var claseLib = require('../lib/clase');
	var surveyLib = require('../lib/survey');
	var lsController = require('../lib/limesurvey/controller');

	lsController.setOptions(options);
	console.log(options);
	lsController.setUser(user,pass);

	surveyLib.setController(lsController);

	router.get('/', auth, function(req, res, next){
		var surveys = [], classrooms = [];
		var db = req.db;

		async.waterfall([
			surveyLib.listSurveys(db, req.session.user._id, surveys),
			claseLib.listClassrooms(db, {user: req.session.user._id}, classrooms),
		], function (err, result) {
			res.render('surveys_list', {surveys: surveys, classrooms: classrooms});
		});
	});

	router.get('/new', auth, function(req, res, next){
		res.render('surveys_new');
	});

	//###################################################
	//################## ALTAENCUESTA ###################
	//###################################################
	router.post('/', auth, function(req, res, next) {
		var pre, post;

		if (!req.files) {
			res.send('No files were uploaded.');
			return;
		}

		var survey = new surveyLib.Survey(req.db, {user: req.session.user._id, name: req.body.name});

		var saveAndRender = function(survey){
			survey.save(function(err,result){
				res.redirect('surveys');
			});
		}

		console.log(req.files);

		if(req.files.pre.name != '')
			survey.setPre(req.files.pre,function(err,result){
				if(req.files.post.name != '')
					survey.setPost(req.files.post,function(err,result){
						saveAndRender(survey);
					});
				else saveAndRender(survey);
			});
		else if(req.files.post.name != '')
			survey.setPost(req.files.post,function(err,result){ saveAndRender(survey); });
	});

	router.post('/addclass', auth, function(req, res) {
		var classroom = new claseLib.Classroom(req.db, {_id: req.body.classroom});
		classroom.load(function(err,result){
			var survey = new surveyLib.Survey(req.db, {_id: req.body.survey});
			survey.load(function(err,result){
				survey.addClassroom(classroom, function(err,result){
					survey.save(function(err,result){
						res.redirect('surveys');
					});
				})
			})
		})
	});

	router.get('/validate', function(req, res, next) {
		if(!req.query.survey)
			return next(new Error("Unknown survey"));

		if(!req.query.token)
			return next(new Error("Unknown token"));

		var sid = req.query.survey;
		var token = req.query.token;
		var survey = [];
		var tid = [];

		async.waterfall([
			lsController.auth,
			lsController.get(sid,survey),
			lsController.started(survey),
			lsController.hasToken(sid,token,tid)
		], function (err, result) {
			if(err)
				return next(new Error(result));
			res.json({message: "Token "+token+" exists for survey "+sid});
		});
	});

	router.get('/completed', function(req, res, next) {
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
			lsController.auth,
			lsController.get(sid,survey),
			lsController.started(survey),
			lsController.hasToken(sid,token,tid),
			lsController.getResponseId(sid,token,rid),
			lsController.tokenHasCompleted(sid,token,rid)
		], function (err, result) {
			if(err)
				return next(new Error(result));
			res.json({message: "Token "+token+" completed survey "+sid});
		});
	});

	router.get('/survey/:survey', function(req, res, next) {
		var token = req.query.token;
		var survey = req.params.survey;
		var url = 'http://polls.e-ucm.es/index.php/' + survey + '?token=' + token;
		res.writeHead(301,{Location: url});
		res.end();
	});

	return router;
}
