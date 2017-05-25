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
 
var async = require('async');
var controller;
var a2;

function setController(_controller){
	controller = _controller;
}

function setA2(_controller){
	a2 = _controller;
}

class Classroom{
	constructor(db, data){
		this.db = db;
		this.games = [];
		this.set(data);
	}

	set(data){
		if(data._id) 		this._id = data._id;
		if(data.user) 		this.user = data.user;
		if(data.key) 		this.key = data.key;
		if(data.codes) 		this.codes = data.codes;
	}

	load(callback){
		var data = {};

		this.loaded = false;
		var s = this;
		async.waterfall([
			getClassroom(s.db,s._id,data)
		], function (e, result) {
			if(e) e = "Classroom: Error loading " + s._id + ": " + result
			else s.set(data);

			callback(e);
		});
	}

	save(callback){
		var collection = this.db.get('classcollection');
		var s = this;

		if(!this._id){
			this.signupMassive(s.codes, function(err, codes){
				s.codes = codes;
				if(!err){
					collection.insert({
						"user": s.user,
						"key": s.key,
						"codes": s.codes
					},function(e,docs) {
						if(!e)
							s.set(docs);
						callback(e);
					});
				}
			});
		}else{
			var aux = new Classroom(this.db, {_id: this._id});
			aux.load(function(err,result){
				var attrs = {};

				if(s.user && s.user !== aux.user) 						attrs['user'] = s.user;
				if(s.key && s.key !== aux.key) 							attrs['key'] = s.key;
				if(s.codes && s.codes !== aux.codes) 					attrs['codes'] = s.codes;

				collection.findOneAndUpdate(
					{"_id": s._id}, // query
					{$set: attrs},
					function(e, docs) {
						if(!err)
							s.set(docs);

						callback(e);
					}
				);
			});
		}
	}

	signupMassive(codes, callback){
		var s = this;
		async.waterfall([
			a2.auth,
			a2.signupMassive(codes),
		], function (err, result) {
			if(result.errorCount > 0){
				for(var i in result.errors){
					codes.splice(codes.indexOf(getCodeFromError(result.errors[i])),1,randomString(4,'A'));
				}
				s.signupMassive(codes, callback);
			}else{
				callback(err, codes);
			}
		});
	}

	delete(callback){
		var collection = this.db.get('classcollection');
		var s = this;
		collection.remove({
			"_id": s._id
		},function(e,docs) {
			callback(e)
		});
	}
}

function getCodeFromError(error) {
	return error.substr(3, error.indexOf('<<')-3);
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


function listClassrooms(db, params, classrooms){
	return function(callback){
		var collection = db.get('classcollection');
		collection.find(params, function(err,docs) {
		   if (err) {
		   		callback(true,"listClassrooms-> Error finding in DB: " + err);
		   }else {
				for (var i=0; i < docs.length; i++) {
					var classroom = {};

					classroom._id = docs[i]._id;
					classroom.user = docs[i].user;
					classroom.key = docs[i].key;
					classroom.codes = docs[i].codes;

					classrooms.push(classroom);
				};
				callback(null);
			}
		});
	}
}



function getClassroom(db, id, clase){
	return function(callback){
		var collection = db.get('classcollection');
		collection.find({"_id": id}, function(err,docs) {
			if (err) {
				callback(true,"getClassroom-> Error finding in DB");
			}else {
				clase._id = docs[0]._id;
				clase.user = docs[0].user;
				clase.key = docs[0].key;
				clase.codes = docs[0].codes;
				callback(null);
			}
		});
	}
}

module.exports = {
	listClassrooms: listClassrooms,
	getClassroom: getClassroom,
	setController: setController,
	setA2: setA2,
	Classroom
}