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
var session_timestamp;
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

/**
 * Create survey
 * @param survey
 */
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
			console.log("ONLINE ERROR -->"+error+"\n"+response+"\n"+body);
			callback(true, "LimeSurvey service unreachable.") 
		}
	});
}

function auth(callback) {
	if(!SESSIONKEY){
		console.log("No session key");
		update_auth_token(callback);
	}else if(Math.round(new Date().getTime()/1000) - session_timestamp > 300){
		//TODO: check if the session is still active
		console.log("Updating token");
		reauth(callback);
	}else{
		callback(null);
	}
}

function reauth(callback) {
	async.waterfall([
		release_session_token,
		update_auth_token
	], function (err, result) {
		callback(null);
	});
}

function release_session_token(callback){
	options.body = JSON.stringify({method:'release_session_key',params:[SESSIONKEY],id:1});

	request(options, function(error, response, body){
	  if (!error && response.statusCode == 200) {
			body = JSON.parse(body);
			console.log("KEY RELEASED -->"+body.result);
			callback(null);
	  }
	  else console.log("ERROR RELEASE AUTH -->"+error+"\n"+response+"\n"+body);  
	});
}


function update_auth_token(callback){
	options.body = JSON.stringify({method:'get_session_key',params:[user,pass],id:1});

	request(options, function(error, response, body){
	  if (!error && response.statusCode == 200) {
			body = JSON.parse(body);
			console.log("NEW KEY -->"+body.result);
			SESSIONKEY=body.result;
			session_timestamp = Math.round(new Date().getTime()/1000);

			callback(null);
	  }
	  else console.log("ERROR AUTH -->"+error+"\n"+response+"\n"+body);  
	});
}

/**
 * Insert survey
 * @param survey
 */
function insert(survey) {
	return function(callback) {
		options.body = JSON.stringify({method:'import_survey',params:[SESSIONKEY,survey,'lss'],id:1});


		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				body = JSON.parse(body);
				console.log("SURVEY ID -->"+body.result);
			
				callback(null,body.result);
			}
			else console.log("ERROR INSERT SURVEY -->"+body);  
		});
	}
}

/**
 * Get survey by identifier
 * @param sid
 * @param survey 
 */
function get(sid,survey) {
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
				if(!survey[0])
					callback(true, "Survey not found");
				else
					callback(null);
			}
			else console.log("ERROR GET SURVEY -->"+body);  
		});
	}
}

/**
 * Start survery by identifier
 * @param surveyId 
 */
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

/**
 * Remove survey by identifier
 * @param surveyId 
 */
function remove(surveyId) {
	return function(callback){
		options.body = JSON.stringify({method:'delete_survey',params:[SESSIONKEY,surveyId],id:1});
		console.log("DELETING -->" + surveyId);

		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				body = JSON.parse(body);
				console.log("SURVEY DELETED -->");
				console.log(body.result);
				callback(null);
			}
			else console.log("ERROR DELETE -->"+body);  
		});
	}
}

/**
 * Check if survey is started
 * @param survey 
 */
function started(survey){
	return function(callback){
		if(survey[0].active === "N")
			callback(true,"Survey is not active");
		else
			callback(null);
	}
}

/**
 * List participants of survey
 * @param survey
 * @param participants 
 */
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

/**
 * Check if survey has given token
 * @param survey
 * @param token 
 */
function hasToken(survey,token){
	return function(callback){
		options.body = JSON.stringify({method:'list_participants',params:[SESSIONKEY,survey,0,100000],id:1});

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


/**
 * Get response of survey by identifier
 * @param sid
 * @param token
 * @param rid 
 */
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

/**
 * Get responses of survey by identifier
 * @param sid
 * @param r 
 */
function getResponses(sid,r){
	return function(callback){
		options.body = JSON.stringify({method:'export_responses',params:[SESSIONKEY,sid,"json","es","all","code","short"],id:1});
		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				body = JSON.parse(body);
				if(body.result.length > 0){
					var raw = JSON.parse(Buffer.from(body.result, 'base64').toString()).responses;

					for (var rid in raw){
						for (var res in raw[rid]){
							if(!r[raw[rid][res].token] || (r[raw[rid][res].token] && !r[raw[rid][res].token].submitdate))
								r[raw[rid][res].token] = raw[rid][res];
						}
					}
				}
				
				callback(null);
			}
			else callback(true,error);  
		});
	}
}

/**
 * Get responses of class
 * @param sid
 * @param classroom
 * @param r 
 */
function getClassResponses(sid,classroom, r){
	return function(callback){
		r["content"] = "";
		options.body = JSON.stringify({method:'export_responses',params:[SESSIONKEY,sid,"csv","es","complete","code","short"],id:1});
		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				body = JSON.parse(body);
				if(body.result.length > 0){
					var csv = Buffer.from(body.result, 'base64').toString().split(/"\r?\n"|\r"/);

					for (var i = 1; i < csv.length; i++){
						var line = csv[i].split(',');
						if(line.length > 1){
							var token = line[4].replace(new RegExp('"', 'g'),'');

							if(classroom.codes.indexOf(token) > -1)
								r["content"] += csv[i] + "\n";
						}
					}
				}
				
				callback(null);
			}
			else callback(true,error);  
		});
	}
}

/**
 * Check if token has completed survey
 * @param survey
 * @param token
 * @param rid 
 */
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

/**
 * Start tokens for survey by identifier 
 * @param surveyId
 */
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

/**
 * Add participants to survey 
 * @param classroom
 * @param survey 
 */
function addParticipants(classroom, survey){
	return function(callback){
		var alumnos = [];
		for(var code in classroom.codes)
			alumnos.push({email:"dummy@dummy.dum",firstname:"dummy",lastname:"dummy",token:classroom.codes[code]});

		options.body = JSON.stringify({method:'add_participants',params:[SESSIONKEY,survey.pre,alumnos,false],id:1});
		
		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				options.body = JSON.stringify({method:'add_participants',params:[SESSIONKEY,survey.post,alumnos,false],id:1});
				request(options, function(error, response, body){
					if (!error && response.statusCode == 200) {
						options.body = JSON.stringify({method:'add_participants',params:[SESSIONKEY,survey.teacher,alumnos,false],id:1});
						request(options, function(error, response, body){
							if (!error && response.statusCode == 200) {
								callback(null,body.result);
							}
							else console.log("ERROR PARTICIPANTS SURVEY TEACHER -->"+body); 
						});
					}
					else console.log("ERROR PARTICIPANTS SURVEY POST -->"+body);  
				});
			}
			else console.log("ERROR PARTICIPANTS SURVEY PRE -->"+body);  
		});
	}
}

/**
 * Delete participants from survey
 * @param classroom
 * @param survey 
 */
function delParticipants(classroom, survey){
	return function(callback){
		options.body = JSON.stringify({method:'delete_participants',params:[SESSIONKEY,survey.pre,classroom.codes],id:1});
		
		console.log(options.body);

		request(options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				console.log(body);
				options.body = JSON.stringify({method:'delete_participants',params:[SESSIONKEY,survey.post,classroom.codes],id:1});
				request(options, function(error, response, body){
					if (!error && response.statusCode == 200) {
						options.body = JSON.stringify({method:'delete_participants',params:[SESSIONKEY,survey.teacher,classroom.codes],id:1});
						request(options, function(error, response, body){
							if (!error && response.statusCode == 200) {
								callback(null,body.result);
							}
							else console.log("ERROR PARTICIPANTS SURVEY TEACHER -->"+body);  
						});
					}
					else console.log("ERROR PARTICIPANTS SURVEY POST -->"+body);  
				});
			}
			else console.log("ERROR PARTICIPANTS SURVEY PRE -->"+body);  
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
	remove: remove,
	started: started,
	participants: participants,
	hasToken: hasToken,
	getResponseId: getResponseId,
	getResponses: getResponses,
	getClassResponses: getClassResponses,
	tokenHasCompleted: tokenHasCompleted,
	startTokensSurvey: startTokensSurvey,
	addParticipants: addParticipants,
	delParticipants: delParticipants
}