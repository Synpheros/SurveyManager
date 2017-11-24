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

		request.get(this.options, function(error, response, body){
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

function createClass(name) {
	return function (callback) {
		console.log("backend: creating class");
		async.waterfall([
			createBackClass(name)
		], function (err, result) {
			callback(null, result);
		});
	}
}

function createClassOld(gameId, name) {
	return function (callback) {
		console.log("backend: creating class");
		async.waterfall([
			createBackClass(name)
		], function (err, result) {
			callback(null, result);
		});
	}
}

function getVersions(game) {
	return function (callback) {
		console.log("backend: getting versions");
		this.options = cloneOptions();
		this.options.url += 'games/' + game + "/versions/";
		this.options.method = "GET";

		request(this.options, function(error, response, body){
			if(error){
				callback(error, body)
			}

			callback(null, JSON.parse(body));
		});
	}
}

function createClassToVersions(name) {
	return function (versions, callback) {
		console.log("backend: creating class to Version");
		var version = versions[0];

		this.options = cloneOptions();
		this.options.body = JSON.stringify({name: name});
		this.options.url += 'games/' + version['gameId'] + "/versions/" + version['_id'] + "/classes";

		request.post(this.options, function(error, response, body){
			if(error){
				callback(true, error)
			}

			callback(null, JSON.parse(body));
		});
	}
}

function createBackClass(name) {
	return function (callback) {
		console.log("backend: creating class2");

		this.options = cloneOptions();
		this.options.body = JSON.stringify({name: name});
		this.options.url += 'classes';

		request.post(this.options, function(error, response, body){
			if(error){
				callback(true, error);
			}

			console.log("backend: created!");
			callback(null, JSON.parse(body));
		});
	}
}

function deleteClass(classid) {
	return function (callback) {
		console.log("backend: deleting class");

		this.options = cloneOptions();
		this.options.url += 'classes/' + classid;
		this.options.method = 'DELETE';

		request(this.options, function(error, response, body){
			if(error){
				callback(true, error);
			}

			console.log("backend: deleted!");
			callback(null, JSON.parse(body));
		});
	}
}

function addUsers(users) {
	return function (classroom, callback) {
		console.log("backend: adding users");
		this.options = cloneOptions();
		this.options.url += "classes/" + classroom._id;
		this.options.method = 'PUT';
		this.options.body = JSON.stringify({students: arrayToLower(users)});

		console.log(JSON.stringify({students: users}));
		console.info(this.options);

		request(this.options, function(error, response, body){
			if (!error && response.statusCode == 200) {
				//console.log(JSON.stringify(error));console.log(JSON.stringify(response));console.log(JSON.stringify(body));
				callback(null,body);
			}
			else console.log("ERROR LOADING -->"+error);
			console.info(response.body);
		});
	}
}

function arrayToLower(a){
	var r = [];
	for(var i in a){
		r.push(a[i].toLowerCase());
	}
	return r;
}


function cloneOptions(){
	return JSON.parse(JSON.stringify(options));
}

module.exports = {
	setOptions: setOptions,
	setAuthToken: setAuthToken,
	loadGames: loadGames,
	createClass: createClass,
	addUsers: addUsers
}