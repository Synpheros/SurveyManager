
function cargaClases(db, user, clases){
		return function(callback){
			var collection = db.get('classcollection');
			collection.find({"username": user}, function(err,docs) {
			   if (err) res.sendStatus("Error finding in DB.");
			   else {
					var numclases = docs.length;
					for (var i=0; i < numclases; i++) {
	                    var numero = i+1;
	                    var numalumnos = docs[i].codigos.length;
	                    var codigos = []
						var id = docs[i].clave;
	                    for (var j=0; j < numalumnos; j++) {
	                        codigos.push(docs[i].codigos[j].codigo);
	                    }
						var entry = {id: numero, clase : id, numalumnos: numalumnos, codigos: codigos};
						clases.push(entry);
					};
					callback(null);
				}
			});
		}
	}

function cargaClase(db, id, clase){
	return function(callback){
		var collection = db.get('classcollection');
		collection.find({"clave": id}, function(err,docs) {
			if (err) res.sendStatus("Error finding in DB.");
			else {
				clase.numalumnos = docs[0].codigos.length;
				clase.codigos = []
				clase.clase = docs[0].clave;
				for (var j=0; j < clase.numalumnos; j++) {
					clase.codigos.push(docs[0].codigos[j].codigo);
				}
			}
			callback(null);
		});
	}
}

module.exports = {
	cargaClases: cargaClases,
	cargaClase: cargaClase
}