
var async = require('async');

class Classroom{
	constructor(db, data){
		this.db = db;
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
		], function (err, result) {
			if(err) err = "Classroom: Error loading " + s._id + ": " + result
			else s.set(data);

			callback(err,s);
		});
	}

	save(callback){
		var collection = this.db.get('classcollection');
		var s = this;
		collection.insert({
			"user": s.user,
			"key": s.key,
			"codes": s.codes
		},function(e,docs) {
			if(!e)
				s.set(docs);

			callback(e,s)
		});
	}

	delete(callback){
		var collection = this.db.get('classcollection');
		var s = this;
		collection.remove({
			"_id": s._id
		},function(e,docs) {
			callback(e,s)
		});
	}
}


function listClassrooms(db, params, classrooms){
	return function(callback){
		var collection = db.get('classcollection');
		collection.find(params, function(err,docs) {
		   if (err) {
		   		callback(true,"listClassrooms-> Error finding in DB");
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
	Classroom
}