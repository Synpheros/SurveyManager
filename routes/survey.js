module.exports = function(app){

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
			creaSurvey(req.files.pre, 'pre', list),
			creaSurvey(req.files.post, 'post', list)
		], function (err, result) {
			registraSurveys(res, req.db, req.body.surveysname, list);
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
			cargaEncuestas(db, userName, encuestas),
			cargaClases(db, userName, clases),
			
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
			cargaClase(db, req.body.claseseleccionada, clase),
			cargaEncuesta(db, req.body.encuesta, encuesta),
			limesurveyAuthentication,
			altaAlumnos(clase,encuesta)
		], function (err, result) {
			if (err) {
				console.log("Error en el registro de clase y encuesta")
			}
			else 
				registraClaseEncuesta(db, clase, encuesta);
			//$dummy = array("email"=>"dummy@dummy.dum","firstname"=>"dummy","lastname"=>"dummy");
			//res.render('claseencuesta', {clase : result.clase, numalumnos: result.numalumnos, codigos: result.codigos})
		});
	});

	//################################################
	//################## FUNCIONES ###################
	//################################################

	function creaSurvey(survey, type, list) {
		return function asyncCreaSurvey(callback) {
			if(survey){
				var survey64 = new Buffer(survey.data, '7bit').toString('base64');

				async.waterfall([
					limesurveyAuthentication,
					altaSurvey(survey64),
					empiezaSurvey,
					empiezaTokensSurvey
				], function (err, result) {
					list[type] = result;
					callback(null);
				});
			}
		}
	}

	function limesurveyAuthentication(callback) {
		//SESSIONKEY = request('GET', options.url, {json:{method:'get_session_key',params: { username : user, password : pass} ,id:1}}).getBody('utf8');

		if(!SESSIONKEY){
			options.body = JSON.stringify({method:'get_session_key',params:[user,pass],id:1});

			request(options, function(error, response, body){
			  if (!error && response.statusCode == 200) {
				  body = JSON.parse(body);

				//*********KEEP THE KEY*********  
				if(SESSIONKEY==="") {
				  console.log("NEW KEY -->"+body.result);
				  SESSIONKEY=body.result;
				} 
				
					callback(null);
			  }
			  else console.log("ERROR -->"+body);  
			});
		}else
			callback(null);
	}

	function altaSurvey(survey) {
		return function asyncAltaSurvey(callback) {
			options.body = JSON.stringify({method:'import_survey',params:[SESSIONKEY,survey,'lss'],id:1});

			request(options, function(error, response, body){
				if (!error && response.statusCode == 200) {
					body = JSON.parse(body);
					console.log("SURVEY ID -->"+body.result);
				
					callback(null,body.result);
				}
				else console.log("ERROR -->"+body);  
			});
		}
	}

	function empiezaSurvey(surveyId,callback) {
		options.body = JSON.stringify({method:'activate_survey',params:[SESSIONKEY,surveyId],id:1});

		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				body = JSON.parse(body);
				console.log("SURVEY STARTED -->"+body.result);
				callback(null,surveyId);
			}
			else console.log("ERROR -->"+body);  
		});
	}

	function empiezaTokensSurvey(surveyId,callback) {
		options.body = JSON.stringify({method:'activate_tokens',params:[SESSIONKEY,surveyId],id:1});

		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				body = JSON.parse(body);
				console.log("SURVEY STARTED -->"+body.result);
				callback(null,surveyId);
			}
			else console.log("ERROR -->"+body);  
		});
	}

	function registraSurveys(res, db, surveysName, list) {
		// Set our collection
		var collection = db.get('surveycollection');
		collection.find({"username": userName}, function(err,docs) {
				if (err) res.sendStatus("Error finding in db.");
				collection.insert({
					"username": userName,
					"id": docs.length,
					"surveysname" : surveysName, 
					"pre": list.pre,
					"post": list.post,
					"clases": []
				},function(e,docs) {
					if (e) {
						console.log("Error registro surveys",e);
					}
					else {
						muestraEncuestas(res, collection);
					}
			   });
		});
	}

	function muestraEncuestas(res, collection) {
		collection.find({"username": userName}, function(err,docs) {
		if (err) res.sendStatus("Error finding in DB.");
		else {
			var numencuestas = docs.length;
			var encuestas = [];
			for (var i=0; i < numencuestas; i++) {
				var nombre = docs[i].surveysname;
				var pre = docs[i].pre;
				var post = docs[i].post;
				var clases;
				if (docs[i].clases)
					clases = docs[i].clases;
				else
					clases = []
				var entry = {nombreencuesta : nombre, pre: pre, post: post, clases: clases};
				encuestas.push(entry);
			}
			res.render('misencuestas', {numencuestas: numencuestas, encuestas: encuestas});
		}
		});
	}

	function cargaEncuestas(db, user, encuestas){
		return function asyncCargaEncuestas(callback){
			
			var collection = db.get('surveycollection');
			collection.find({"username": user}, function(err,docs) {
			   if (err) res.sendStatus("Error finding in DB.");
			   else {
					var numencuestas = docs.length;
					for (var i=0; i < numencuestas; i++) {
						var nombre = docs[i].surveysname;
						var pre = docs[i].pre;
						var post = docs[i].post;
						var clases = docs[i].clases;
						var entry = {nombreencuesta : nombre, pre: pre, post: post, clases: clases};
						encuestas.push(entry);
					}
					callback(null);
				}
			});
		}
	}

	function cargaEncuesta(db, id, encuesta){
		return function asyncCargaEncuesta(callback){
			console.log(callback);
			
			var collection = db.get('surveycollection');
			collection.find({"surveysname": id}, function(err,docs) {
			   if (err) res.sendStatus("Error finding in DB.");
			   else {
					encuesta.nombreencuesta = docs[0].surveysname;
					encuesta.pre = docs[0].pre;
					encuesta.post = docs[0].post;
				}
				callback(null);
			});
		}
	}

	function registraClaseEncuesta(db, clase, encuesta) {
		var collection = db.get('surveycollection');
		collection.findAndModify(
			{"surveysname": encuesta.nombreencuesta}, // query
			{$addToSet: {clases: clase.clase}},
			{}, // options
			function(err, object) {
			  if (err){
				  console.log(err.message);  // returns error if no matching object found
			  }
		});
	}

	function altaAlumnos(clase, encuesta){
		return function asyncAltaAlumnos(callback){
			var alumnos = [];
			for(var codigo in clase.codigos)
				alumnos.push({email:"dummy@dummy.dum",firstname:"dummy",lastname:"dummy",token:clase.codigos[codigo]});

			options.body = JSON.stringify({method:'add_participants',params:[SESSIONKEY,encuesta.pre,alumnos,false],id:1});
			
			request(options, function(error, response, body){
				if (!error && response.statusCode == 200) {
					options.body = JSON.stringify({method:'add_participants',params:[SESSIONKEY,encuesta.post,alumnos,false],id:1});
					request(options, function(error, response, body){
						if (!error && response.statusCode == 200) {
							callback(null,body.result);
						}
						else console.log("ERROR -->"+body);  
					});
				}
				else console.log("ERROR -->"+body);  
			});
		}
	}
}