/*
 * Copyright 2017 e-UCM (http://www.e-ucm.es/)
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
var controller;

function setController(_controller){
	controller = _controller;
}

class Survey{

	constructor(db, data){
		this.db = db;
		this.set(data);
	}

	set(data){
		if(data._id) 			this._id = data._id;
		if(data.user) 			this.user = data.user;
		if(data.name) 			this.name = data.name;
		if(data.pre) 			this.pre = data.pre;
		if(data.post) 			this.post = data.post;
		if(data.classrooms) 	this.classrooms = data.classrooms;
		else 					this.classrooms = [];
	}

	load(callback){
		var data = {};

		this.loaded = false;
		var s = this;
		async.waterfall([
			getSurvey(s.db,s._id,data)
		], function (err, result) {
			if(err) err = "Survey: Error loading " + s._id + ": " + result
			else s.set(data);

			callback(err,s);
		});
	}

	save(callback){
		var collection = this.db.get('surveycollection');
		var s = this;

		console.log("SAVING --> " + this.name);

		if(!this._id){ //NEW INSERTION
			var attrs = {
				"user": s.user,
				"name" : s.name,
				"classrooms": s.classrooms
			}

			if(this.pre) attrs["pre"] = this.pre;
			if(this.post) attrs["post"] = this.post;

			collection.insert(attrs,function(e,docs) {
				if(!e)
					s.set(docs);

				callback(e,s)
			});
		}else{ //UPDATE
			var aux = new Survey(this.db, {_id: this._id});
			aux.load(function(err,result){
				var attrs = {};

				if(s.user && s.user !== aux.user) 						attrs['user'] = s.user;
				if(s.name && s.name !== aux.name) 						attrs['name'] = s.name;
				if(s.pre && s.pre !== aux.pre) 							attrs['pre'] = s.pre;																
				if(s.post && s.post !== aux.post) 						attrs['post'] = s.post;
				if(s.classrooms && s.classrooms !== aux.classrooms) 	attrs['classrooms'] = s.classrooms;

				collection.findOneAndUpdate(
					{"_id": s._id}, // query
					{$set: attrs},
					function(err, docs) {
						if(!err)
							s.set(docs);

						callback(err, s);
					}
				);
			});
		}
	}

	setPre(survey64, callback){
		var list = [];
		var s = this;
		async.waterfall([
			controller.create(survey64),
		], function (err, result) {
			s.pre = result;
			callback(err,result);
		});
	}

	setPost(survey64, callback){
		var list = [];
		var s = this;
		async.waterfall([
			controller.create(survey64),
		], function (err, result) {
			s.post = result;
			callback(err,result);
		});
	}

	addClassroom(classroom, callback){
		var s = this;

		async.waterfall([
			controller.auth,
			controller.addParticipants(classroom,s)
		], function (err, result) {
			if(!err){
				s.classrooms.push({_id: classroom._id, active: true});
			}

			callback(err,s);
		});
	}

	delete(callback){
		var collection = this.db.get('surveycollection');
		var s = this;

		var toRemove = [controller.auth];

		if(this.pre)
			toRemove.push(controller.remove(this.pre))
		if(this.post)
			toRemove.push(controller.remove(this.post))

		async.waterfall(toRemove, function(e,r){
			collection.remove({
				"_id": s._id
			},function(e,docs) {
				
			});

			callback(e)
		});
	}
}

function listSurveys(db, params, surveys){
	return function(callback){
		console.log("loading surveys");
		var collection = db.get('surveycollection');
		collection.find(params, function(err,docs) {
			if (err) callback(true, "ListSurveys-> Error finding in DB.");
			else {
				if(docs)
					for (var i=0; i < docs.length; i++) {
						var survey = {};
						survey._id = docs[i]._id;
						survey.name = docs[i].name;
						survey.pre = docs[i].pre;
						survey.post = docs[i].post;
						survey.classrooms = docs[i].classrooms;
						surveys.push(survey);
					}

				callback(null);
			}
		});
	}
}

function getSurvey(db, id, survey){
	return function(callback){
		var collection = db.get('surveycollection');
		collection.find({"_id": id}, function(err,docs) {
			if (err) console.log("getSurvey-> Error finding in DB.");
			else {
				survey._id = docs[0]._id;
				survey.user = docs[0].user;
				survey.name = docs[0].name;
				survey.pre = docs[0].pre;
				survey.post = docs[0].post;
				survey.classrooms = docs[0].classrooms;
			}
			callback(null);
		});
	}
}

function getResponses(survey, list){
	return function(callback){
		var s = this;
		async.waterfall([
			controller.auth,
			controller.getResponses(survey,list),
		], function (err, result) {
			callback(null);
		});
	}
}

module.exports = {
	setController: setController,
	listSurveys: listSurveys,
	getSurvey: getSurvey,
	getResponses: getResponses,
	Survey
}
