module.exports = function(auth, options){

	var express = require('express'),
    router = express.Router();

	var request = require('request');
	var async = require('async');


	var user = 'admin';
	var pass = '123456';

	var claseLib = require('../lib/clase');
	var surveyLib = require('../lib/survey');

	// Initialize Limesurvey Controller
	var lsController = require('../lib/limesurvey/controller');

	lsController.setOptions(options['limesurvey']);
	lsController.setUser(user,pass);

	// Initialize A2 Controller
	var a2Controller = require('../lib/a2/controller');

	a2Controller.setOptions(options['a2']["config"]);
	a2Controller.setUser(options['a2']["username"],options['a2']["password"]);

	// Initialize Backend Controller
	var backController = require('../lib/backend/controller');

	backController.setOptions(options['backend']);

	// Set the controllers to the libraries
	surveyLib.setController(lsController);
	claseLib.setController(backController);
	claseLib.setA2(a2Controller);

	router.get('/', auth(1), function(req, res, next){
		var surveys = [], classrooms = [];
		var db = req.db;

		async.waterfall([
			surveyLib.listSurveys(db, {user: req.session.user._id}, surveys),
			claseLib.listClassrooms(db, {user: req.session.user._id}, classrooms),
		], function (err, result) {
			var auxclass = [];
			for(var i = 0; i<classrooms.length; i++)
				auxclass[classrooms[i]._id] = classrooms[i];
			res.render('surveys_list_material', {surveys: surveys, classrooms: classrooms, auxclass: auxclass});
		});
	});

	router.get('/view/:survey_id', auth(2), function(req, res, next){
		var survey = new surveyLib.Survey(req.db, {_id: req.params.survey_id});
		var classrooms = [];
		var db = req.db;

		survey.load(function(err, result){
			async.waterfall([
				claseLib.listClassrooms(db, {user: req.session.user._id}, classrooms),
			], function (err, result) {
				if(err){
					console.log(err);
					callback(err, result);
				}
				else{
					var auxclass = [];
					for(var i = 0; i<classrooms.length; i++)
						auxclass[classrooms[i]._id] = classrooms[i];
					res.render('surveys_view_material', {survey: survey, classrooms: classrooms, auxclass: auxclass});
				}
			});
		});
	});

	router.get('/new', auth(1), function(req, res, next){
		res.render('surveys_new');
	});

	router.get('/delete/:survey_id', auth(2), function(req, res, next) {
		var survey = new surveyLib.Survey(req.db, {_id: req.params.survey_id});
		var db = req.db;

		survey.load(function(err, result){
			if(err)
				return next(new Error(err));

			survey.delete(function(err,result){
				if(err)
					return next(new Error(err));

				res.redirect('../../surveys');
			});
		});
	});

	// Add new survey
	router.post('/', auth(1), function(req, res, next) {
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

		var surveys_to_add = [];

		if(req.files.pre.name != ''){
			surveys_to_add.push(function(callback){ return survey.setPre(req.files.pre,function(err,result){ callback(); }); });
		}

		if(req.files.post.name != ''){
			surveys_to_add.push(function(callback){ return survey.setPost(req.files.post,function(err,result){ callback(); }); });
		}

		if(req.files.teacher.name != ''){
			surveys_to_add.push(function(callback){ return survey.setTeacher(req.files.teacher,function(err,result){ callback(); }); });
		}

		/*	survey.setPre(req.files.pre,function(err,result){
				if(req.files.post.name != '')
					survey.setPost(req.files.post,function(err,result){
						saveAndRender(survey);
					});
				else saveAndRender(survey);
			});
		else if(req.files.post.name != '')
			survey.setPost(req.files.post,function(err,result){ saveAndRender(survey); });*/


		async.waterfall(surveys_to_add, function (err, result) {
			saveAndRender(survey)
		});

	});

	// Add class
	router.post('/addclass', auth(1), function(req, res) {
		var classroom = new claseLib.Classroom(req.db, {_id: req.body.classroom});
		classroom.load(function(err,result){
			var survey = new surveyLib.Survey(req.db, {_id: req.body.survey});
			survey.load(function(err,result){
				survey.addClassroom(classroom, function(err,result){
					survey.save(function(err,result){
						res.redirect('../surveys/view/' + req.body.survey);
					});
				})
			})
		})
	});

	// Delete class
	router.post('/delclass', auth(1), function(req, res) {
		var classroom = new claseLib.Classroom(req.db, {_id: req.body.classroom});
		classroom.load(function(err,result){
			var survey = new surveyLib.Survey(req.db, {_id: req.body.survey});
			survey.load(function(err,result){
				survey.delClassroom(classroom, function(err,result){
					survey.save(function(err,result){
						res.redirect('../surveys/view/' + req.body.survey);
					});
				})
			})
		})
	});

	router.get('/switch', auth(1), function(req,res,next){
		if(!req.query.survey)
			return next(new Error("Unknown survey"));

		if(!req.query.classroom)
			return next(new Error("Unknown classroom"));

		var sid = req.query.survey;
		var cid = req.query.classroom;

		var classroom = new claseLib.Classroom(req.db, {_id: cid});
		classroom.load(function(err,result){
			var survey = new surveyLib.Survey(req.db, {_id: sid});
			survey.load(function(err,result){
				for(var i = 0; i < survey.classrooms.length; i++){
					if(classroom._id.toString() == survey.classrooms[i]._id.toString()){
						survey.classrooms[i].active = !survey.classrooms[i].active;
						break;
					}
				}

				survey.save(function(err,result){
					if(err)
						return next(new Error(err));

					res.redirect('../surveys/view/' + req.query.survey);
				})
			})
		})
	})

	router.get('/validate', function(req, res, next) {
		if(!req.query.survey)
			return next(new Error("Unknown survey"));

		if(!req.query.token)
			return next(new Error("Unknown token"));

		var sid = parseInt(req.query.survey);
		var token = req.query.token;
		var survey = [];
		var tid = [];

		getClassForCode(req.db, sid, token, function(err, result){
			if(err)
				return next(new Error(result));
			
			async.waterfall([
				lsController.online,
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
			lsController.online,
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
		if(!req.query.token){
			res.status(400);
			return res.json({error: "Request must include a Token"});
		}
		var token = req.query.token;
		
		if(!req.params.survey){
			res.status(400);
			return res.json({error: "Request must include a survey"});
		}
		var survey = req.params.survey;

		var url = req.app.config.externalLimesurveyUrl + survey + '?token=' + token;
		res.writeHead(301,{Location: url});
		res.end();
	});

	/**
	 * Get class where given code and survey belong to
	 * @param db
	 * @param survey
	 * @param code
	 */
	function getClassForCode(db, survey,code,callback){
		var surveys = [], classrooms = [];

		async.waterfall([
			claseLib.listClassrooms(db, {codes: code}, classrooms),
			surveyLib.listSurveys(db, {$or: [{pre: survey}, {post: survey}]}, surveys),
		], function (err, result) {
			if(err)
				callback(err, result);
			else{
				console.log(classrooms);
				console.log(surveys);
				if(classrooms && classrooms.length > 0){
					if(surveys && surveys.length > 0){
						var found = false;
						for(var i = 0; i < surveys[0].classrooms.length; i++){
							var c = surveys[0].classrooms[i];
							console.log(c._id + " " + classrooms[0]._id);
							if(c._id.toString() == classrooms[0]._id.toString()){
								found = true;
								if(c.active){
									callback(null, classrooms);
								}else
									callback(true, "No active class found for this token and survey.");
								break;
							}
						}
						if(!found)
							callback(true, "Classroom "+classrooms[0].key+"("+code+") has not started this survey");
					}else
						callback(true, "Survey "+survey+" not found");	
				}else
					callback(true, "Classroom not found for token: " + code);
				
			}
		});
	}

	return router;
}
