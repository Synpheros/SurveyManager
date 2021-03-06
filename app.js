var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var config = require('./config');

var mongo = require('mongodb');
var monk = require('monk');
var db = monk(config.mongodb.uri);
var index = require('./routes/index');

db.collection('classcollection');
db.collection('surveycollection');

var app = express();
app.config = config;

var fileUpload = require('express-fileupload');
app.use(fileUpload());


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser());
//app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({secret: 'sm app', cookie: {}}));

// Make our db accessible to our router
app.use(function(req,res,next){
   req.db = db;
   next();
});

index(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // render the error page
  var info = {
        message: err.message,
        error: true
    };

    console.log(err);
    //info.stack = err.stack;

  res.status(err.status || 500).send(info);
});

module.exports = app;
