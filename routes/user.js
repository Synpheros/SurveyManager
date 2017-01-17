/* GET home page. */

module.exports = function(app){

	app.get('/', function(req, res, next) {
		res.render('index', { title: 'Home' });
	});

	/* GET register page. */
	app.get('/register', function(req, res, next) {
		res.render('register', { title: 'Registro profesor'});
	});

	/* GET login page. */
	app.get('/login', function(req, res, next) {
		res.render('login', { title: 'Acceso profesor' });
	});

	/* GET userlist page. */
	app.get('/userlist', function(req, res) {
		var db = req.db;
		var collection = db.get('usercollection');
		collection.find({},{},function(e,docs){
			res.render('userlist', {
				"userlist" : docs
			});
		});
	});

	/* GET teacher view page. */
	app.get('/teacherview', function(req, res, next) {
		res.render('teacherview', { title: 'Vista del profesor' });
	});

	/* POST to register new teacher */
	app.post('/register', function(req, res) {

		// Set our internal DB variable
		var db = req.db;

		// Get our form values. These rely on the "name" attributes
		userName = req.body.username;
		var userEmail = req.body.mail;
		var userPass = req.body.pass;

		// Check repeated passwords match
		if (userPass != req.body.pass2) {
			res.send("Error. Las contraseñas no coinciden.");
			return;
		}

		// Set our collection
		var collection = db.get('usercollection');

		collection.find({ $or: [ {"username": userName}, {"email": userEmail} ]}, function(err,docs) {
			if (err) res.send(err);
			if (docs.length > 0) {
				// Username or email already exist
				res.send("Error. Ya existe el usuario.");
			}
			else {
				// Submit to the DB
				collection.insert({
					"username" : userName,
					"email" : userEmail,
					"pass": userPass
				}, function (err, doc) {
					if (err) {
						// If it failed, return error
						res.send("There was a problem adding the information to the database.");
					}
					else {
						// Forward to success page
						res.render('teacherview', {username : userName});
					}
				});
			} 
		});

	});

	/* POST to login teacher */
	app.post('/login', function(req, res) {

		// Set our internal DB variable
		var db = req.db;

		// Get our form values. These rely on the "name" attributes
		userName = req.body.username;
		var userPass = req.body.pass;

		// Set our collection
		var collection = db.get('usercollection');

		collection.find({"username": userName}, function(err,docs) {
		   if (err) res.send(err);
		   if (docs.length > 0) {
			    // Username exists
			    if (docs[0].pass == userPass) {
				    var classcollection = db.get('classcollection');
					classcollection.find({"username": userName}, function(err,docs) {
					   if (err) clases = 0;
					   else clases = docs.length;
					// Forward to success page
				    res.render('teacherview', {username : userName, clases: clases});
				    });
			    }
			    else {
			        res.send("Error. Contraseña incorrecta.");
			    }
		   }
		   else {
			   res.send("Error. El usuario no existe.")
		   } 
		});

	});

	/* POST to teacher view */
	app.post('/teacherview', function(req, res) {

	    /* alta nueva clase */
	    if (req.body.clasenueva) {
			var Nalumnos = req.body.alumnos;

			// generamos los codigos aleatorios para los alumnos
			var codigos = [];
			for (var i=0; i < Nalumnos; i++) {
				var codigo = randomString(4, 'A');
				while (repetido(codigo, codigos)) {
					var codigo = randomString(4, 'A');
				}
				var j = i+1;
				var numero = j > 9 ? "" + j: "0" + j;
				var entry = {numero : numero, codigo : codigo};
				codigos.push(entry);
			};
			 
			// Set our internal DB variable
			var db = req.db;

			// Set our collection
			var collection = db.get('classcollection');
			collection.find({"username": userName}, function(err,docs) {
				if (err) res.sendStatus("Error finding in db.");
				collection.insert({
					"username": userName, 
					"class": docs.length + 1, 
					"clave": req.body.clave,
					"alumnos": Nalumnos, 
					"codigos": codigos
				},function(e,docs) {
					if (e) {
					 	res.sendStatus("Error inserting in db."+e);
					}
					else {
						res.render('altaclase', {alumnos : Nalumnos, codigos : codigos});
					}
			   });

			});
	    }

	    /* ver mis clases */
	    else if (req.body.misclases) {
			// Set our internal DB variable
			var db = req.db;
			
			// Set our collection
			var collection = db.get('classcollection');
			collection.find({"username": userName}, function(err,docs) {
				if (err) res.sendStatus("Error finding in DB.");
				else {
					var numclases = docs.length;
					var clases = [];
					for (var i=0; i < numclases; i++) {
						var id = i+1;
						var clave = docs[i].clave;
						var numalumnos = docs[i].codigos.length;
						var codigos = []
						for (var j=0; j < numalumnos; j++) {
							codigos.push(docs[i].codigos[j].codigo);
						}
						var entry = {id: numero, clase : clave, numalumnos: numalumnos, codigos: codigos};
						clases.push(entry);
					}
					res.render('misclases', {numclases: numclases, clases: clases});
			   }
			});
	   }
		else if (req.body.altaencuesta) {
			res.render('altaencuesta', {});
		}
		else if (req.body.verencuestas) {
			res.render('misencuestas', {});
		}
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
}