var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var session = require('express-session');
var passport = require('passport');
var OAuth2Strategy = require('passport-oauth').OAuth2Strategy;
const axios = require('axios');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'my-precious',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use('oauth2', new OAuth2Strategy({
  authorizationURL: 'https://app.simplelogin.io/oauth2/authorize',
  tokenURL: 'https://app.simplelogin.io/oauth2/token',
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/authorization-code/callback'
},
  function (accessToken, refreshToken, profile, done) {
    // with accessToken, we can obtain user information
    axios({
      method: 'get',
      url: 'https://app.simplelogin.io/oauth2/userinfo',
      headers: {
        Authorization: accessToken
      }
    }).then(res => {
      console.log(res);
      var user = { email: res.data.email, name: res.data.name };
      done(null, user);
    }).catch(err => {
      console.log("error:", err);
    })

  }
));

passport.serializeUser((user, next) => {
  next(null, user);
});

passport.deserializeUser((obj, next) => {
  next(null, obj);
});

// call passport when user logs in
app.use('/login', passport.authenticate('oauth2'));

// Once user authorizes this client, the browser will redirect him/her back to this route. This route the `callbackURL` when we setup passport
app.use('/authorization-code/callback',
  passport.authenticate('oauth2', { 
    successRedirect: '/profile',
    failureRedirect: '/login', 
    failureFlash: true 
  })
);

// Redirect user to /login if user accidentally goes to /profile route
function ensureLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect('/login')
}

app.use('/profile', ensureLoggedIn, (req, res) => {
  res.render('profile', { title: 'Express', user: req.user });
});

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
