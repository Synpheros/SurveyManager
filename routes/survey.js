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
	lsController.setUser(user,pass);

	surveyLib.setController(lsController);

	router.get('/', auth, function(req, res, next){
		var surveys = [], classrooms = [];
		var db = req.db;

		async.waterfall([
			surveyLib.listSurveys(db, {user: req.session.user._id}, surveys),
			claseLib.listClassrooms(db, {user: req.session.user._id}, classrooms),
		], function (err, result) {
			var auxclass = [];
			for(var i = 0; i<classrooms.length; i++)
				auxclass[classrooms[i]._id] = classrooms[i];
			res.render('surveys_list', {surveys: surveys, classrooms: classrooms, auxclass: auxclass});
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
						res.redirect('../surveys');
					});
				})
			})
		})
	});

	router.get('/switch', auth, function(req,res,next){
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

					res.redirect('../surveys');
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

	function getClassForCode(db, survey,code,callback){
		var surveys = [], classrooms = [];

		async.waterfall([
			claseLib.listClassrooms(db, {codes: {code: code}}, classrooms),
			surveyLib.listSurveys(db, {$or: [{pre: survey}, {post: survey}]}, surveys),
		], function (err, result) {
			if(err)
				callback(err, result);
			else{
				if(classrooms){
					if(surveys){
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
							callback(true, "Class not found for this survey");
					}else
						callback(true, "Survey not found.");	
				}else
					callback(true, "Classroom not found.");
				
			}
		});
	}

	return router;
}
