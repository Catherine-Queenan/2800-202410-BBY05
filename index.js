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

app.get('/', (req,res) => {
	res.render('about');
});

//Page to choose what account to sign up for (business or client)
app.get('/signup', (req, res) => {
	res.render('signupChoice')
});

//Renders form for business or client sign up
app.get('/signup/:form', (req, res) => {
	let form = req.params.form;
	if(form == "business"){
		res.render('signUpAdmin.ejs');
	} else if (form == "client") {
		res.render('signUpClient.ejs');
	} 
});

//Submitting info collected from sign up forms
app.post('/submitSignup/:type', async(req, res) => {
	let type = req.params.type;
	
	//Submits info for client side forms
	if(type == "client"){
		//Validation schema for inputted values
		var schema = Joi.object (
			{
				firstName: Joi.string().pattern(/^[a-zA-Z\s]*$/).max(20).required(),
				lastName: Joi.string().pattern(/^[a-zA-Z\s]*$/).max(20).required(),
				email: Joi.string().email().required(),
				phone: Joi.string().pattern(/^[0-9\s]*$/).length(10).required(),
				password: Joi.string().max(20).min(2).required()
			}
		);

		//store user inputs from req.body
		var user = {
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			email: req.body.email,
			phone: req.body.phone,
			password: req.body.password
		};

		//validate inputs against schema
		var validationRes = schema.validate(user);

		//Deal with errors from validation
		if(validationRes.error != null){
			let doc = '<p>Invalid Signup</p><br><a href="/signup">Try again</a></body>';
			res.send(doc);
			return;
		}

		//Hash entered password for storing
		var hashPass = await bcrypt.hash(user.password, saltRounds);

		//Store client information in client collection
		await clientsCollection.insertOne({
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			phone: user.phone,
			password: hashPass
		});

	//Submits info for business side forms
	} else if (type == "business"){

		//Validation schema for user inputs
		var schema = Joi.object (
			{
				companyName: Joi.string().pattern(/^[a-zA-Z\s]*$/).max(20).required(),
				businessEmail: Joi.string().email().required(),
				businessPhone: Joi.string().pattern(/^[0-9\s]*$/).length(10).required(),
				firstName: Joi.string().pattern(/^[a-zA-Z\s]*$/).max(20).required(),
				lastName: Joi.string().pattern(/^[a-zA-Z\s]*$/).max(20).required(),
				companyWebsite: Joi.string().pattern(/^[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/),
				password: Joi.string().max(20).min(2).required()
			}
		);

		//Stores all user inputs that a user types in from req.body
		var user = {
			companyName: req.body.companyName,
			businessEmail: req.body.businessEmail,
			businessPhone: req.body.businessPhone,
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			companyWebsite: req.body.companyWebsite,
			password: req.body.password
		};

		//Validates user inputs against schema
		var validationRes = schema.validate(user);

		//Deals with errors from validation
		if(validationRes.error != null){
			let doc = '<body><p>Invalid Signup</p><br><a href="/signup">Try again</a></body>';
			res.send(doc);
			return;
		}

		//hashes password for storing
		var hashPass = await bcrypt.hash(user.password, saltRounds);

		//If the user select the services they provide it is stored in an array
		//This currently only functions for the single checkbox and would need to be adjusted for multiple service options
		user.services = [];
		if(Boolean(req.body.services)){
			user.services.push(req.body.services);
		}

		//Store business information in client collection
		await adminsCollection.insertOne({
			companyName: user.companyName,
			businessEmail: user.businessEmail,
			businessPhone: user.businessPhone,
			services: user.services,
			firstName: user.firstName,
			lastName: user.lastName,
			companyWebsite: user.companyWebsite,
			password: hashPass,
		});
	} 

	//Update the session for the now logged in user
	req.session.authenticated = true;
	req.session.cookie.maxAge = expireTime;
	
	//Redirect to home
	res.redirect('/');
});



app.use(express.static(__dirname + "/public"));

app.get('*', (req,res) => {
	res.status(404);
	res.render('errorMessage', {error: 'Page not found - 404'});
})

app.listen(port, () => {
	console.log("Node application listening on port " + port);
});