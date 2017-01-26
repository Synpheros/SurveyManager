/* GET home page. */

module.exports = function(auth){

	var express = require('express'),
    router = express.Router();

	router.get('/', auth, function(req, res, next) {
		res.redirect('users/teacherview');
	});

	/* GET login page. */
	router.get('/login', function(req, res, next) {
		res.render('login', { title: 'Acceso profesor' });
	});

	/* GET register page. */
	router.get('/register', function(req, res, next) {
		res.render('register', { title: 'Registro profesor'});
	});

	/* GET userlist page. */
	router.get('/userlist', auth, function(req, res) {
		var db = req.db;
		var collection = db.get('usercollection');
		collection.find({},{},function(e,docs){
			res.render('userlist', {"userlist" : docs });
		});
	});

	/* GET teacher view page. */
	router.get('/teacherview', auth, function(req, res, next) {
		var db = req.db;
		var classcollection = db.get('classcollection');
		classcollection.find({"user": req.session.user._id}, function(err,docs) {
			if (err) clases = 0;
			else clases = docs.length;
			res.render('teacherview', {username : req.session.user.username, clases: clases});
		});
	});

	/* POST to register new teacher */
	router.post('/register', function(req, res) {

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
						req.session.user = doc;
						// Forward to success page
						res.redirect('teacherview');
					}
				});
			} 
		});

	});

	/* POST to login teacher */
	router.post('/login', function(req, res) {

		// Set our internal DB variable
		var db = req.db;

		// Get our form values. These rely on the "name" attributes
		var userName = req.body.username;
		var userPass = req.body.pass;

		// Set our collection
		var collection = db.get('usercollection');

		collection.find({"username": userName}, function(err,docs) {
		   if (err) res.send(err);
		   if (docs.length > 0) {
			    // Username exists
			    if (docs[0].pass == userPass) {
					req.session.user = docs[0];
				    res.redirect('teacherview');
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

	return router;
}