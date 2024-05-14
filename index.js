require("./utils.js");
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const app = express();
const port = process.env.PORT || 3000;
const Joi = require('joi');

// 1 hour
const expireTime = 60 * 60 * 1000;

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

var { database } = include('databaseConnection');

// ----- Collections -----
const clientsCollection = database.db(mongodb_database).collection('clientUsers');
const adminsCollection = database.db(mongodb_database).collection('adminUsers');
// const accountCollection = database.db(mongodb_database).collection(req.session.username);
// This don't work ^

app.set('view engine', 'ejs');

app.use(express.urlencoded({extended: false}));

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
	crypto: {
		secret: mongodb_session_secret
	}
});

app.use(session({ 
    secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true
}));

function isValidSession(req) {
	if (req.session.authenticated) {
		return true;
	} else {
		return false;
	}
}

function sessionValidation(req,res,next) {
	if (isValidSession(req)) {
		next();
	} else {
		res.redirect('/login');
	}
}

function isAdmin(req) {
	if (req.session.user_type == 'admin') {
		return true;
	} else {
		return false;
	}
}

function adminAuthorization(req,res,next) {
	if (!isAdmin(req)) {
		res.status(403);
		res.render('errorMessage', {error: 'Not Authorized - 403'});
	} else {
		next();
	}
}

 
function iconRedirect(action) {
	res.redirect(action);
}

app.get('/', (req,res) => {
	res.render('about');
})

// Login routing
app.get('/login', (req, res) => {
	res.render('login.ejs')
});

// Handling login subission information
app.post('/submitLogin', async (req,res) => {

	//save the given email and password from login
	email = req.body.email;
	password = req.body.password

	// validation for entering a string, max 50 chars, and it's required
	const schema = Joi.string().max(50).required();
	const validationResult = schema.validate(email);
	if (validationResult.error != null) {
	   res.redirect("/login");
	   return;
	}

	// find a result for the client accounts first
	var result = await clientsCollection.find({email: email}).project({email: 1, password: 1, _id: 1}).toArray();

	// if there are no clients, search through the admin accounts
	if (result.length == 0) {
		result = await adminsCollection.find({businessEmail: email}).project({email: 1, password: 1, _id: 1}).toArray();
	}
	
	// check the passwords to see if they match. If they do, create a session for the user and send them to the
	if (await bcrypt.compare(password, result[0].password)) {
		req.session.authenticated = true;
		req.session.email = email;
		req.session.cookie.maxAge = expireTime;

		res.render('about'); // I am unsure what pages we would like to redirect to in this current time
	} else {

		// if the password is incorrect, say so
		res.render('errorMessage', { error: "password is incorrect," });
	}
});




app.use(express.static(__dirname + "/public"));

app.get('*', (req,res) => {
	res.status(404);
	res.render('errorMessage', {error: 'Page not found - 404'});
})

app.listen(port, () => {
	console.log("Node application listening on port " + port);
});