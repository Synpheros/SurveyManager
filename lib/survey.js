//################################################
//################## FUNCIONES ###################
//################################################

var request = require('request');
var async = require('async');
var SESSIONKEY = "";
var options = {};
var user, pass;

function setOptions(_options){
	options = _options;
}

function setUser(_user,_pass){
	user = _user;
	pass = _pass;
}

function creaSurvey(survey, type, list) {
	return function (callback) {
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
		  else console.log("ERROR AUTH -->"+body);  
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
			else console.log("ERROR ALTA -->"+body);  
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
		else console.log("ERROR START -->"+body);  
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
		else console.log("ERROR TOKEN -->"+body);  
	});
}

function registraSurveys(db, user, surveysName, list) {
	return function(callback){
		// Set our collection
		var collection = db.get('surveycollection');
		collection.find({"username": user}, function(err,docs) {
				if (err) res.sendStatus("Error finding in db.");
				collection.insert({
					"username": user,
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
						callback(null)
					}
			   });
		});
	}
}

function muestraEncuestas(db, user){
	return function(callback){
		var collection = db.get('surveycollection');
		collection.find({"username": user}, function(err,docs) {
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
			callback(null, encuestas);
		}
		});
	}
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

function registraClaseEncuesta(db, clase, encuesta){
	return function(callback){
		var collection = db.get('surveycollection');
		collection.findAndModify(
			{"surveysname": encuesta.nombreencuesta}, // query
			{$addToSet: {clases: clase.clase}},
			{}, // options
			function(err, object) {
			  if (err){
				  console.log(err.message);  // returns error if no matching object found
			  }
			  callback(null);
		});
	}
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
					else console.log("ERROR PARTICIPANTS -->"+body);  
				});
			}
			else console.log("ERROR PARTICIPANTS -->"+body);  
		});
	}
}

module.exports = {
	setOptions: setOptions,
	setUser: setUser,
	creaSurvey: creaSurvey,
	limesurveyAuthentication: limesurveyAuthentication,
	altaSurvey: altaSurvey,
	empiezaSurvey: empiezaSurvey,
	empiezaTokensSurvey: empiezaTokensSurvey,
	registraSurveys: registraSurveys,
	muestraEncuestas: muestraEncuestas,
	cargaEncuestas: cargaEncuestas,
	cargaEncuesta: cargaEncuesta,
	registraClaseEncuesta: registraClaseEncuesta,
	altaAlumnos: altaAlumnos
}
