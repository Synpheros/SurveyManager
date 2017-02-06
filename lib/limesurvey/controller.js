/*
 * Copyright 2016 e-UCM (http://www.e-ucm.es/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * This project has received funding from the European Union’s Horizon
 * 2020 research and innovation programme under grant agreement No 644187.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0 (link is external)
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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

function create(survey) {
	return function (callback) {
		if(survey){
			var survey64 = new Buffer(survey.data, '7bit').toString('base64');

			async.waterfall([
				auth,
				insert(survey64),
				start,
				startTokensSurvey
			], function (err, result) {
				callback(null, result);
			});
		}
	}
}

function online(callback){
	options.body = JSON.stringify({});

	request(options, function(error, response, body){
		if (!error && response.statusCode == 200) {
			console.log("Limesurvey ONLINE")	
			callback(null);
		}
		else {
			console.log("ERROR -->"+error+"\n"+response+"\n"+body);
			callback(true, "LimeSurvey service unreachable.") 
		}
	});
}

function auth(callback) {
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
		  else console.log("ERROR AUTH -->"+error+"\n"+response+"\n"+body);  
		});
	}else
		callback(null);
}

function insert(survey) {
	return function(callback) {
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

function get(sid,survey) {
	return function(callback) {
		options.body = JSON.stringify({method:'list_surveys',params:[SESSIONKEY],id:1});

		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				body = JSON.parse(body);
				for(i in body.result){
					if(body.result[i].sid == sid){
						console.log(body.result);
						survey[0] = body.result[i];
						break;
					}
				}
				if(!survey[0])
					callback(true, "Survey not found");
				else
					callback(null);
			}
			else console.log("ERROR ALTA -->"+body);  
		});
	}
}

function start(surveyId,callback) {
	options.body = JSON.stringify({method:'activate_survey',params:[SESSIONKEY,surveyId],id:1});
	console.log("STARTING -->" + surveyId);

	request(options, function(error, response, body){
		if (!error && response.statusCode == 200) {
			body = JSON.parse(body);
			console.log("SURVEY STARTED -->"+body.result);
			callback(null,surveyId);
		}
		else console.log("ERROR START -->"+body);  
	});
}

function started(survey){
	return function(callback){
		if(survey[0].active === "N")
			callback(true,"Survey is not active");
		else
			callback(null);
	}
}

function participants(survey, participants){
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

function hasToken(survey,token){
	return function(callback){
		options.body = JSON.stringify({method:'list_participants',params:[SESSIONKEY,survey,0,500],id:1});

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
						for(var i=0; i<body.result.length; i++)
							rid.push(body.result[i]);

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

				if(rid.length >0){
					var completed = false;
					for(var i = 0; i < rid.length; i++){
						if(responses[i][rid[i]].submitdate){
							completed = true;
							break;
						}
					}

					if(completed)
						callback(null);
					else
						callback(true, "Survey not completed yet");

				}else callback(true, "Not response found");
			}
			else callback(true,error);  
		});
	}
}

function startTokensSurvey(surveyId,callback) {
	options.body = JSON.stringify({method:'activate_tokens',params:[SESSIONKEY,surveyId],id:1});

	request(options, function(error, response, body){
		if (!error && response.statusCode == 200) {
			body = JSON.parse(body);
			console.log("SURVEY TOKENS STARTED -->"+body.result);
			callback(null,surveyId);
		}
		else console.log("ERROR TOKEN -->"+body);  
	});
}

function addParticipants(classroom, survey){
	return function(callback){
		var alumnos = [];
		for(var code in classroom.codes)
			alumnos.push({email:"dummy@dummy.dum",firstname:"dummy",lastname:"dummy",token:classroom.codes[code].code});

		options.body = JSON.stringify({method:'add_participants',params:[SESSIONKEY,survey.pre,alumnos,false],id:1});
		
		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				options.body = JSON.stringify({method:'add_participants',params:[SESSIONKEY,survey.post,alumnos,false],id:1});
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
	create: create,
	online: online,
	auth: auth,
	insert: insert,
	get: get,
	start: start,
	started: started,
	participants: participants,
	hasToken: hasToken,
	getResponseId: getResponseId,
	tokenHasCompleted: tokenHasCompleted,
	startTokensSurvey: startTokensSurvey,
	addParticipants: addParticipants
}