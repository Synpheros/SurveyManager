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

function getSurvey(sid,survey) {
	return function(callback) {
		options.body = JSON.stringify({method:'list_surveys',params:[SESSIONKEY],id:1});

		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				body = JSON.parse(body);
				for(i in body.result){
					if(body.result[i].sid == sid){
						survey[0] = body.result[i];
						break;
					}
				}
				callback(null);
			}
			else console.log("ERROR ALTA -->"+body);  
		});
	}
}

function checkSurveyStarted(survey){
	return function(callback){
		console.log(survey[0]);
		if(survey[0].active === "N")
			callback(true,"Survey is not active");
		else
			callback(null);
	}
}

function listParticipants(survey, participants){
	return function(callback){
		options.body = JSON.stringify({method:'list_participants',params:[SESSIONKEY,survey],id:1});

		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				body = JSON.parse(body);
				for(i in body.result){
					if(body.result[i].sid == sid){
						survey[0] = body.result[i];
						break;
					}
				}
				callback(null);
			}
			else callback(true,error);  
		});
	}
}


function checkSurveyToken(survey,token){
	return function(callback){
		options.body = JSON.stringify({method:'list_participants',params:[SESSIONKEY,survey],id:1});

		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				body = JSON.parse(body);
				var found = false;

				for(i in body.result){
					if(body.result[i].token === token){
						found = true;
						break;
					}
				}

				if(found)
					callback(null);
				else
					callback(true,"Token not found for this survey");
			}
			else callback(true,error);  
		});
	}
}

function getResponseId(sid,token,rid){
	return function(callback){
		options.body = JSON.stringify({method:'get_response_ids',params:[SESSIONKEY,sid,token],id:1});

		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				body = JSON.parse(body);
				if(!body.error){
					if(body.result.length == 0)
						callback(true,"Not responses");
					else{
						rid[0] = body.result[0];
						callback(null);
					}
				}else
					callback(true,body.error);
			}
			else{
				callback(true,"table not initialized");
			}
		});
	}
}

function tokenHasCompleted(survey, token, rid){
	return function(callback){
		options.body = JSON.stringify({method:'export_responses_by_token',params:[SESSIONKEY,survey,"json",token,"es","all","code","short"],id:1});

		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				body = JSON.parse(body);
				responses = JSON.parse(Buffer.from(body.result, 'base64').toString()).responses;

				if(!responses[0][rid[0]]){
					callback(true, "Not response found");
				}else if(!responses[0][rid[0]].submitdate){
					callback(true, "Survey not completed yet");
				}else
					callback(null);
			}
			else callback(true,error);  
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
	getSurvey: getSurvey,
	checkSurveyStarted: checkSurveyStarted,
	listParticipants: listParticipants,
	checkSurveyToken: checkSurveyToken,
	tokenHasCompleted: tokenHasCompleted,
	getResponseId: getResponseId,
	empiezaSurvey: empiezaSurvey,
	empiezaTokensSurvey: empiezaTokensSurvey,
	registraSurveys: registraSurveys,
	muestraEncuestas: muestraEncuestas,
	cargaEncuestas: cargaEncuestas,
	cargaEncuesta: cargaEncuesta,
	registraClaseEncuesta: registraClaseEncuesta,
	altaAlumnos: altaAlumnos
}
