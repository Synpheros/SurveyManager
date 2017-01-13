module.exports = function(app){
	/* GET mis clases view page. */
	app.get('/misclases', function(req, res, next) {
	  res.render('misclases', { title: 'Mis clases' });
	});

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

	// funcion auxiliar para chequear si un numero ya ha sido usado
	function repetido(codigo, usados) {
		var repe = false;
		for (var i = 0; i < usados.length; i++) {
			if (codigo == usados[i]) {
				repe = true;
			}
		}
		return repe;
	}

	function cargaClases(db, user, clases){
		return function asyncCargaClases(callback){
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
		return function asyncCargaClase(callback){
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

}