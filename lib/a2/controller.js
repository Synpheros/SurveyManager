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
var AUTH_TOKEN = "";
var options = {};
var user = "", pass = "";

function setOptions(_options){
	options = _options;
	options = cloneOptions();
}

function setUser(username,password){
	user = username;
	pass = password;
}

function auth(callback) {
	if(!AUTH_TOKEN){
		update_auth_token(callback);
	}else if(Math.round(new Date().getTime()/1000) - session_timestamp > 300){
		//TODO: check if the session is still active
		console.log("Updating a2 token");
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
	AUTH_TOKEN = "";
}


function update_auth_token(callback){
	this.options = cloneOptions();
	this.options.url += "login";
	this.options.body = JSON.stringify({ username: user, password: pass});
	this.options.method = "POST";

	request(this.options, function(error, response, body){
	  if (!error && response.statusCode == 200) {
			body = JSON.parse(body);
			console.log("A2: token --> "+ body.user.token);
			AUTH_TOKEN = body.user.token;
			options.headers['Authorization'] = 'Bearer ' + body.user.token;
			session_timestamp = Math.round(new Date().getTime()/1000);

			callback(null);
	  }
	  else console.log("ERROR AUTH -->"+error+"\n"+response+"\n"+body);  
	});
}

function signupMassive(codes) {
	return function (callback) {
		var users = [];
		for (var code in codes){
			users.push({username: codes[code], password: codes[code], email: codes[code] + "@surveymanager.com", role: "student", prefix: "gleaner"});
		}

		this.options = cloneOptions();
		this.options.url += "signup/massive";
		this.options.body = JSON.stringify({users: users});
		this.options.method = "POST";

		request.post(this.options, function(error, response, body){
			if(error){
				callback(true, error)
			}
			callback(null, body);
		});
	}
}


function cloneOptions(){
	return JSON.parse(JSON.stringify(options));
}

module.exports = {
	setOptions: setOptions,
	setUser: setUser,
	auth: auth,
	signupMassive: signupMassive
}