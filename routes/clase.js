module.exports = function(auth){

	var express = require('express'),
    router = express.Router();
    var async = require('async');

    var claseLib = require('../lib/clase');

	/* GET mis clases view page. */
	router.get('/', auth, function(req, res, next) {
		var clases = [];
		var db = req.db;

		async.waterfall([
			claseLib.listClassrooms(db,{"user": req.session.user._id},clases)
		], function (err, result) {
			if(err)
				return next(new Error(result));
			res.render('classes_list', { title: 'Mis clases', clases: clases});
		});
	});

	router.get('/view/:class_id', auth, function(req, res, next) {
		var classroom = new claseLib.Classroom(req.db, {_id: req.params.class_id});

		classroom.load(function(err, result){
			res.render('classes_view', {classroom: result});
		});
	});

	router.post('/', auth, function(req, res, next){
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

			var url = '/classes/view/' + result._id;
			res.redirect(url);
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