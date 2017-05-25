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

function setOptions(_options){
	options = _options;
	options = cloneOptions();
}

function setAuthToken(auth_token){
	AUTH_TOKEN = auth_token;
	options.headers['Authorization'] = "Bearer " + auth_token;
}

function loadGames(games) {
	return function(callback) {
		this.options = cloneOptions();
		this.options.url += "games/public";
		this.options.method = 'GET';

		console.log(JSON.stringify(this.options));

		request.get(this.options, function(error, response, body){
			console.log(JSON.stringify(error));
			console.log(JSON.stringify(response));
			console.log(JSON.stringify(body));
			if (!error && response.statusCode == 200) {
				body = JSON.parse(body);
				for(var i in body){
					games.push(body[i]);
				}

				callback(null,body);
			}
			else console.log("ERROR LOADING -->"+error);  
		});
	}
}

function createClass(gameId, name, users) {
	return function (callback) {
		async.waterfall([
			getVersions(gameId),
			createClassToVersions(name)
		], function (err, result) {
			callback(null, result);
		});
	}
}

function createClassToVersions(name) {
	return function (versions, callback) {
		var version = versions[0];

		this.options = cloneOptions();
		this.options.body = JSON.stringify({name: name});
		this.options.path = 'games/' + version['gameId'] + "/versions/ " + version['_id'] + "/classes";

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
	setAuthToken: setAuthToken,
	loadGames: loadGames,
	createClass: createClass
}