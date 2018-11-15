module.exports = function(auth,options){

	var express = require('express'),
    router = express.Router();
    var async = require('async');
    var fs = require('fs');

    var claseLib = require('../lib/clase');
    var officegen = require('officegen');

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

	a2Controller.setUser(options['a2']['username'],options['a2']['password']);
	a2Controller.setOptions(options['a2']["config"]);

	// Initialize Backend Controller
	var backController = require('../lib/backend/controller');
	backController.setOptions(options['backend']);

	// Set the controllers to the libraries
	surveyLib.setController(lsController);
	claseLib.setController(backController);
	claseLib.setA2(a2Controller);


	/* GET classes view page. */
	router.get('/', auth(1), function(req, res, next) {
		var clases = [];
		var db = req.db;

		async.waterfall([
			claseLib.listClassrooms(db,{"user": req.session.user._id},clases)
		], function (err, result) {
			if(err)
				return next(new Error(result));
			res.render('classes_list_material', { title: 'Mis clases', clases: clases});
		});
	});

	router.get('/view/:class_id', auth(2), function(req, res, next) {
		var classroom = new claseLib.Classroom(req.db, {_id: req.params.class_id});
		var surveys = [];
		var games = [];
		var db = req.db;

		backController.setAuthToken(req.session.user.token);

		classroom.load(function(err, result){
			console.info(classroom);

			async.waterfall([
				surveyLib.listSurveys(db, {"classrooms" : {$elemMatch: {"_id": classroom._id}}}, surveys),
				backController.loadGames(games)
			], function (err, result) {
				if(err){
					callback(err, result);
				}
				else{
					var responsequerys = [];

					var getAndAdd = function(survey){
						return function(callback){
							var waterfall = [];
							var pre_r = [], post_r = [], teacher_r = [];

							if(survey.pre)
								waterfall.push(surveyLib.getResponses(survey.pre,pre_r))
							if(survey.post)
								waterfall.push(surveyLib.getResponses(survey.post,post_r))
							if(survey.teacher)
								waterfall.push(surveyLib.getResponses(survey.teacher,teacher_r))

							async.waterfall(waterfall, function(err, result){
								survey.pre_r = pre_r;
								survey.post_r = post_r;
								survey.teacher_r = teacher_r;
								callback(null);
							});
						}
					}

					var traces = [];

					for(var i = 0; i < classroom.codes.length; i++){
						var exist = fs.existsSync('public/traces/' + classroom.codes[i] + '.csv');
						if(exist)
							traces[classroom.codes[i]] = true;
					}

					for(var i = 0; i < surveys.length; i++){
						console.log(i);
						responsequerys.push(getAndAdd(surveys[i]));
					}

					async.waterfall(responsequerys, function (err, result) {
						res.render('classes_view_material', {classroom: classroom, surveys: surveys, traces, games: games});
					});
				}
			});
		});
	});

	router.get('/delete/:class_id', auth(2), function(req, res, next) {
		var classroom = new claseLib.Classroom(req.db, {_id: req.params.class_id});
		var surveys = [];
		var db = req.db;

		classroom.load(function(err, result){
			if(err)
				return next(new Error(err));

			async.waterfall([
				surveyLib.listSurveys(db, {"classrooms" : {$elemMatch: {"_id": classroom._id}}}, surveys)
			], function (err, result) {
				if(err){
					return next(new Error(err));
				}

				var delclass = function(result, error){
					if(error)
						return next(new Error(error));

					classroom.delete(function(e,result){
						if(e)
							return next(new Error(e));

						res.redirect('../../classes');
					});
				}
				var delclasfromsurvey = function(survey){
					return function(callback){
						var survey = new surveyLib.Survey(req.db, s);
						survey.delClassroom(classroom, function(err,result){
							survey.save(function(err,result){
								callback();
							});
						});
					}
				}

				var todo = [];
				for(var s of surveys){
					todo.push(delclasfromsurvey(s));
				}

				async.waterfall(todo, delclass);
			});
		});
	});

	router.get('/word/:class_id', auth(2), function(req, res, next) {
		var classroom = new claseLib.Classroom(req.db, {_id: req.params.class_id});

		classroom.load(function(err, result){

			var docx = officegen('docx');

			var table = [
			  [{
			    val: "Clase " + classroom.name + ":",
			    opts: {
			      cellColWidth: 6000,
			      b:true,
			      font_size: 20
			    }
			  }],
			  [{
			    val: "No.",
			    opts: {
			      cellColWidth: 1000,
			      b:true,
			      font_size: 18
			    }
			  },{
			    val: "Nombre",
			    opts: {
			      b:true,
			      cellColWidth: 4000,
			      align: "right",
			      font_size: 18
			    }
			  },{
			    val: "Codigo",
			    opts: {
			      cellColWidth: 2000,
			      align: "center",
			      vAlign: "center",
			      b:true,
			      sz: '36'
			    }
			  }],
			]

			for(var i = 0; i< classroom.codes.length; i++){
				table.push([i+1,"",classroom.codes[i].code]);
			}
			 
			var tableStyle = {
			  tableColWidth: 3000,
			  tableColor: "ada",
			  tableAlign: "left",
			  tableFontFamily: "Consolas",
			  tableFontSize: '36',
			  borders: true
			}
			 
			docx.createTable (table, tableStyle);

			var out = fs.createWriteStream ( 'tmp/'+classroom._id.toString()+'.docx' );

			out.on ( 'error', function ( err ) {
				console.log ( err );
			});

			async.parallel ([
				function ( done ) {
					out.on ( 'close', function () {
						console.log ( 'Finish to create a DOCX file.' );
						done ( null );
					});
					docx.generate ( out );
				}

			], function ( err ) {
				if ( err ) {
					console.log ( 'error: ' + err );
				} 

			res.render('classes_view', {classroom: result});
			});
		});
	});

	router.get('/pdf/:class_id', auth(2), function(req, res, next) {
		var classroom = new claseLib.Classroom(req.db, {_id: req.params.class_id});

		classroom.load(function(err, result){
			var pdf = require('html-pdf');

			var colspan = 6 + Object.keys(classroom.metadata).length;
			var html = '<!DOCTYPE html><html><head><title></title><style type="text/css">body{padding:10px} table{font-size: 18px;font-family: "DejaVu Sans Mono"; border: solid 2px black;border-collapse: collapse;}table td{border: solid 2px black;text-align: center;}</style></head>';
			html += '<body><table width="100%" style=""><tr><th colspan="' + colspan + '" style="text-align:left">Clase '+classroom.key+':</th></tr><tr><td width="5%">No.</td><td width="45%">Nombre</td>';

			for (var key in classroom.metadata) {
				html += '<td>' + key + '</td>';
			}

			html += '<td width="40%" colspan="4">Código</td></tr>';
			html += '<tr><td>'+ (1) + '</td><td></td>';

			for (var key in classroom.metadata) {
				html += '<td>' + classroom.metadata[key].values[classroom.codes[0]] + '</td>';
			}

			html += '<td>'+classroom.codes[0]+'</td><td>'+classroom.codes[0]+'</td><td>'+classroom.codes[0]+'</td><td>'+classroom.codes[0]+'</td></tr>';

			for(var i = 1; i < classroom.codes.length; i++){
				if((i%30)==0){
					html += '</table><br><br><table width="100%" style=""><tr><th colspan="6" style="text-align:left">Clase '+classroom.key+':</th></tr><tr><td width="5%">No.</td><td width="45%">Nombre</td><td width="40%" colspan="4">Código</td></tr>';
				}
				html += '<tr><td>'+ (i+1) + '</td><td></td>';
				for (var key in classroom.metadata) {
					html += '<td>' + classroom.metadata[key].values[classroom.codes[i]] + '</td>';
				}
				html += '<td>'+classroom.codes[i]+'</td><td>'+classroom.codes[i]+'</td><td>'+classroom.codes[i]+'</td><td>'+classroom.codes[i]+'</td></tr>';
			}

			html += '</table></body></html>';

			/*'450px', height: '640px'*/
			pdf.create(html, { format: 'A4' }).toFile('public/pdf/'+classroom._id.toString()+'.pdf', function(err, response) {
				if (err) return console.log(err);
				res.redirect('../../pdf/'+classroom._id+'.pdf');
			});
		});
	});

	router.get('/export/:class_id', function(req, res, next) {
		var classroom = new claseLib.Classroom(req.db, {_id: req.params.class_id});
		var survey = req.query.survey;

		classroom.load(function(err, result){
			var responses = [];
			async.waterfall([
				surveyLib.getClassResponses(survey,classroom, responses)
			], function(e,r){
				var filename = classroom.key+"_"+survey+".csv";

				fs.writeFile("public/csv/"+filename, responses.content, function(err) {
					if(err) {
					return console.log(err);
					}

					res.redirect('../../csv/'+filename);
				}); 
				
			});
		});
	});

	router.get('/rebuild', function(req, res, next) {
		var clases = [];
		var db = req.db;

		async.waterfall([
			claseLib.listClassrooms(db,{},clases)
		], function (e, r) {
			if(e)
				return next(new Error(result));

			var total = [];
			var toSave = [];

			for(var i = 0; i < clases.length; i++){
				var clase = new claseLib.Classroom(db, clases[i]);
				var codes = [];
				for(var j = 0; j < clases[i].codes.length; j++)
					codes.push(clases[i].codes[j].code);
				
				clase.codes = codes;
				
				clase.save(function(){});
			}

			if(e)
				res.json({message: "Error: " + err, error: true});
			else
				res.json({message: "Rebuilt"});
		});
	});

	router.post('/', auth(1), function(req, res, next){
		backController.setAuthToken(req.session.user.token);
		var db = req.db;
		var classrooms = [];

		if(req.files) {
			// import mode
			if(req.files.csv.name != ''){
				var csv = new Buffer(req.files.csv.data, '7bit').toString();

				csv = csv.split(/\r?\n|\r/);

				var classes = [];
				for(var i = 1; i < csv.length; i++){
					csv[i] = csv[i].split(req.body.separator);

					if(csv[i][1]){
						if(!classes[csv[i][1]])
							classes[csv[i][1]] = [];
						
						classes[csv[i][1]].push(csv[i][0]);
					}
				}

				var total = 0;
				var saveAll = function(n){
					return function(){
						total++;

						if(total >= n){
							res.redirect('classes');
						}
					}
				}
				
				for(var i in classes){
					var classroom = new claseLib.Classroom(req.db, {
						key: i,
						user: req.session.user._id,
						codes: classes[i]
					});

					classroom.save(saveAll(classes.length));
				}
			}
			
			return;
		}else{
			async.waterfall([
				claseLib.listClassrooms(db,{},classrooms)
			], function (err, result) {
				if(err)
					return next(new Error(result));

				var codes = []

				if(classrooms.length > 0)
					for(var i = 0; i < classrooms.length; i++)
						codes = codes.concat(classrooms[i].codes)

				codes = generateCodes(req.body.learners, 4, 'A',codes);

				var classroom = new claseLib.Classroom(req.db, {
					user: req.session.user._id,
					key: req.body.key,
					codes: codes
				});

				classroom.save(function(err, result){
					if(err)
						return next(new Error(err));

					res.redirect('classes/view/' + classroom._id);
				})
			});
		}
	});

	router.post('/collector', function(req, res, next){
		var token = req.body.token;
		var traces = req.files.traces;

		var filename = token + ".csv";

		if(!token || !traces){
			res.json({message: "Error: Unknown token or traces", error: true});
		}else{
			fs.writeFile("public/traces/"+filename, new Buffer(traces.data, '7bit').toString(), function(err) {
				if(err) {
					res.json({message: "Error: " + err, error: true});
				}else{
					res.json({message: "success"});
				}
			}); 
		}
	});

	router.post('/addgame', auth(1), function(req, res) {
		backController.setAuthToken(req.session.user.token);
		var classroom = new claseLib.Classroom(req.db, {_id: req.body.classroom});
		classroom.load(function(err,result){
			classroom.addGame(req.body.game, function(err,result){
				classroom.save(function(err,result){
					res.redirect('../classes/view/' + req.body.classroom);
				});
			})
		})
	});

	router.post('/:classid/metadata', auth(1), function(req, res) {

		var classroom = new claseLib.Classroom(req.db, {_id: req.params.classid});

		try {
			var metadata = JSON.parse(req.body.definition);
		}catch(error){
			res.redirect('../../classes/view/' + req.params.classid);
		}

		classroom.load(function(err,result){
			classroom.addMetaData(metadata, function(err,result){
				if(err){
					console.info(err);
					console.info(classroom);
				}

				res.redirect('../../classes/view/' + req.params.classid);
			})
		})
	});

	router.get('/metadata/:metadataid/:code', function(req, res) {

		var classrooms = [];
		async.waterfall([
			claseLib.listClassrooms(req.db, {codes: req.params.code}, classrooms)
		], function (err, result) {
			var classroom = new claseLib.Classroom(req.db, classrooms[0]);

			classroom.load(function(err,result){
				if(err){
					res.status(400);
					return res.json({ message: "Error obtainig the value", error: err });
				}

				try{
					res.json({ value: classroom.getMetaData(req.params.metadataid, req.params.code) });
				}catch(error){
					res.status(400);
					res.json({ message: "Incorrect metadataId", error: error });
				}
			})
		});
	});

	router.post('/metadata/:metadataid/:code', auth(1), function(req, res) {

		var classrooms = [];
		async.waterfall([
			claseLib.listClassrooms(req.db, {codes: req.params.code}, classrooms)
		], function (err, result) {
			var classroom = new claseLib.Classroom(req.db, classrooms[0]);

			console.info(classroom);

			classroom.load(function(err,result){
				if(err){
					res.status(400);
					return res.json({ message: "Error loading class", error: err });
				}

				classroom.setMetaData(req.params.metadataid, req.params.code, req.body.value, function(err,result){
					if(err){
						res.status(400);
						return res.json({ message: "Error adding value", error: err });
					}

					res.json({ success: true });
				})
			})
		});
	});

	/**
	 * Generate codes 
	 * @param number 
	 * @param length
	 * @param chars
	 * @param codes 
	 */
	function generateCodes(number, length, chars, codes = []){
		var ret = [];
		for (var i=0; i < number; i++) {
			var code;
			do{
				code = randomString(4, 'A');
			}while (repeated(code, codes) > -1);

			codes.push(code);
			ret.push(code);
		};
		return ret;
	}

	/**
	 * Generates random string of given length
	 * @param length
	 * @param chars
	 */
	function randomString(length, chars) {
		var mask = '';
		if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
		if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		if (chars.indexOf('#') > -1) mask += '0123456789';
		if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
		var result = '';
		for (var i = length; i > 0; i--) result += mask[Math.floor(Math.random() * mask.length)];
		return result;
	}

	/**
	 * Checks if a code has already been used
	 * @param code
	 * @param used
	 */
	function repeated(code, used) {
		return used.indexOf(code);
	}

	return router;
}