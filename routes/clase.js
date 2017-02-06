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
	var lsController = require('../lib/limesurvey/controller');

	lsController.setOptions(options);
	lsController.setUser(user,pass);

	surveyLib.setController(lsController);

	/* GET mis clases view page. */
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
		var db = req.db;

		classroom.load(function(err, result){
			async.waterfall([
				surveyLib.listSurveys(db, {}, surveys),
			], function (err, result) {
				if(err){
					console.log(err);
					callback(err, result);
				}
				else{
					var realsurveys = [];
					for(var s = 0; s < surveys.length; s++)
						for(var i = 0; i < surveys[s].classrooms.length; i++){
							var c = surveys[s].classrooms[i];
							if(c._id.toString() == classroom._id.toString()){
								realsurveys.push(surveys[s]);
								break;
							}
						}

					var responsequerys = [];

					var getAndAdd = function(survey){
						return function(callback){
							var waterfall = [];
							var pre_r = [],post_r = [];

							if(survey.pre)
								waterfall.push(surveyLib.getResponses(survey.pre,pre_r))
							if(survey.post)
								waterfall.push(surveyLib.getResponses(survey.post,post_r))

							async.waterfall(waterfall, function(err, result){
								survey.pre_r = pre_r;
								survey.post_r = post_r;
								callback(null);
							});
						}
					}

					for(var i = 0; i < realsurveys.length; i++){
						console.log(i);
						responsequerys.push(getAndAdd(realsurveys[i]));
					}

					async.waterfall(responsequerys, function (err, result) {
						res.render('classes_view_material', {classroom: classroom, surveys: realsurveys});
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

			classroom.delete(function(err,result){
				if(err)
					return next(new Error(err));

				res.redirect('../../classes');
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

			console.log("created_table");

			var out = fs.createWriteStream ( 'tmp/'+classroom._id.toString()+'.docx' );

			console.log("writestream");

			out.on ( 'error', function ( err ) {
				console.log ( err );
			});

			console.log("2");

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

				console.log("3");

			res.render('classes_view', {classroom: result});
			});
		});
	});

	router.get('/pdf/:class_id', auth(2), function(req, res, next) {
		var classroom = new claseLib.Classroom(req.db, {_id: req.params.class_id});

		classroom.load(function(err, result){
			var pdf = require('html-pdf');

			var html = '<!DOCTYPE html><html><head><title></title><style type="text/css">body{padding:10px;} table{font-size: 20pt;font-family: Consolas;border: solid 2px black;border-collapse: collapse;}table td{border: solid 2px black;text-align: center;}</style></head>';
			html += '<body><table width="100%" style=""><tr><th colspan="6" style="text-align:left">Clase '+classroom.key+':</th></tr><tr><td width="5%">No.</td><td width="45%">Nombre</td><td width="40%" colspan="4">Código</td></tr>';

			for(var i = 0; i < classroom.codes.length; i++){
				if(i==26)
					html += '</table></body><table><tr><td width="5%">No.</td><td width="45%">Nombre</td><td width="40%" colspan="4">Código</td></tr><br><br>';

				html += '<tr><td>'+ (i+1) + '</td><td></td><td>'+classroom.codes[i].code+'</td><td>'+classroom.codes[i].code+'</td><td>'+classroom.codes[i].code+'</td><td>'+classroom.codes[i].code+'</td></tr>';
			}

			html += '</table></body></html>';


			pdf.create(html, { format: 'Letter' }).toFile('public/pdf/'+classroom._id.toString()+'.pdf', function(err, response) {
				if (err) return console.log(err);
				res.redirect('../../pdf/'+classroom._id+'.pdf');
			});
		});
	});

	router.post('/', auth(1), function(req, res, next){
		var db = req.db;

		var codes = generateCodes(req.body.learners, 4, 'A');

		var classroom = new claseLib.Classroom(req.db, {
			user: req.session.user._id,
			key: req.body.key,
			codes: codes
		});

		classroom.save(function(err, result){
			if(err)
				return next(new Error(err));

			res.redirect('classes/view/' + result._id);
		})
	});

	function generateCodes(number, length, chars){
		var codes = [];
		for (var i=0; i < number; i++) {
			var code = randomString(4, 'A');
			while (repeated(code, codes)) {
				var code = randomString(4, 'A');
			}
			var entry = {code : code};
			codes.push(entry);
		};
		return codes;
	}

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

	// funcion auxiliar para chequear si un numero ya ha sido usado
	function repeated(codigo, usados) {
		var repe = false;
		for (var i = 0; i < usados.length; i++) {
			if (codigo == usados[i]) {
				repe = true;
			}
		}
		return repe;
	}

	return router;
}