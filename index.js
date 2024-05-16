require("./utils.js");
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');

const multer = require("multer");
const stream = require("stream");
const cloudinary = require('cloudinary').v2;


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
const mongodb_appdb = process.env.MONGODB_APPDATABASE;
const mongodb_businessdb = process.env.MONGODB_BUSINESSDATABASE;
const mongodb_clientdb = process.env.MONGODB_CLIENTDATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;

const google_keys = process.env['GOOGLE_CREDS'];
/* END secret section */

// var { database } = include('databaseConnection');

//Creating a MongoClient and using it to connect to a specified database
const MongoClient = require("mongodb").MongoClient;
// let atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${database}?retryWrites=true`;
let appdb = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_appdb}?retryWrites=true`);

// This database is set when the user is logged in or signs up for the first time using setUserDatabase().
let userdb = '';

// ----- Collections -----
const appUserCollection = appdb.db(mongodb_appdb).collection('users');
// const clientsCollection = database.db(mongodb_database).collection('clientUsers');
// const adminsCollection = database.db(mongodb_database).collection('adminUsers');
// const accountCollection = database.db(mongodb_database).collection(req.session.username);
// This don't work ^

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));

// This is for storing active sessions
var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
	crypto: {
		secret: mongodb_session_secret
	}
});

// Cloudinary Config (image storage)
const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
const cloud_api_key = process.env.CLOUDINARY_CLOUD_KEY;
const cloud_api_secret = process.env.CLOUDINARY_CLOUD_SECRET;

cloudinary.config({
	secure: true,
	cloud_name: cloud_name,
	api_key: cloud_api_key,
	api_secret: cloud_api_secret
});


//File uploader
const storage = multer.memoryStorage();
const upload = multer({storage: storage});

app.use(session({
	secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false,
	resave: true
}));

function isClient(req) {
	if (req.session.userType == 'client') {
		return true;
	} else {
		return false;
	}
}

function isBusiness(req) {
	if (req.session.userType == 'business') {
		return true;
	} else {
		return false;
	}
}

function isValidSession(req) {
	if (req.session.authenticated) {
		return true;
	} else {
		return false;
	}
}

function sessionValidation(req, res, next) {
	if (isValidSession(req)) {
		next();
	} else {
		res.redirect('/login');
	}
}

function isAdmin(req) {
	if (req.session.userType == 'admin') {
		return true;
	} else {
		return false;
	}
}

function adminAuthorization(req, res, next) {
	if (!isAdmin(req)) {
		res.status(403);
		res.render('errorMessage', { error: 'Not Authorized - 403' });
	} else {
		next();
	}
}

// Sets the database for current user
function setUserDatabase(req) {
	if (!req.session) {
		userdb = null;
	} else {
		let db = '';
		if (isClient(req)) {
			let clientEmail = req.session.email.split('.').join("");
			db = mongodb_clientdb + '-' + clientEmail;
		} else if (isBusiness(req)) {
			db = mongodb_businessdb + '-' + req.session.name;
		}
		let userdbAccess = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${db}?retryWrites=true`);
		userdb = userdbAccess.db(db);
	}
	// console.log(userdb);
}

//Upload files to drive function
async function uploadImage (fileObject){
	//Pre: fileObject must be from req.file (user upload. (method from multer))
	//Post: returns the cloud url the image is now stored at
	let imageUrl;
	let buf64 = fileObject.buffer.toString('base64');
	await cloudinary.uploader.upload("data:image/png;base64," + buf64, {folder: "clientAccountAvatars"}, function(error, result) { //_stream
		imageId = result.public_id;
  	});
  return imageId;
};

//delete images from the cloudinary storage
async function deleteUploadedImage(id){
	//Pre: id must be empty or a valid public_id from cloudinary
	//Post: image is deleted from cloudinary
	console.log(id);
	if(id != ''){
		cloudinary.uploader.destroy(id, function(result) { console.log(result) });
	}
}

// TODO: Add access to pages and create a check for the user type and authorization
// status to determine what footer and navbar to display

app.get('/', (req, res) => {
	res.render('index', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType});
});

app.get('/about', (req, res) => {
	res.render('about');
});

app.get('/FAQ', (req, res) => {
	res.render('FAQ', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType});
});

app.get('/clientResources', (req, res) => {
	res.render('clientResources', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType});
});

//Page to choose what account to sign up for (business or client)
app.get('/signup', (req, res) => {
	res.render('signupChoice', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType});
});

//Renders form for business or client sign up
app.get('/signup/:form', (req, res) => {
	let form = req.params.form;
	if (form == "business") {
		res.render('signUpBusiness.ejs', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType});
	} else if (form == "client") {
		res.render('signUpClient.ejs', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType});
	}
});

//Submitting info collected from sign up forms
app.post('/submitSignup/:type', async (req, res) => {
	let type = req.params.type;

	//Submits info for client side forms
	if (type == "client") {
		//Validation schema for inputted values
		var schema = Joi.object(
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
		if (validationRes.error != null) {
			let doc = '<p>Invalid Signup</p><br><a href="/signup">Try again</a></body>';
			res.send(doc);
			return;
		}

		//Hash entered password for storing
		var hashPass = await bcrypt.hash(user.password, saltRounds);

		//Store new user info in the appdb
		await appUserCollection.insertOne({
			email: user.email,
			companyName: null,
			firstName: user.firstName,
			lastName: user.lastName,
			phone: user.phone,
			password: hashPass,
			userType: 'client'
		});

		//Update the session for the now logged in user
		req.session.authenticated = true;
		req.session.email = user.email;
		req.session.name = user.firstName +' '+ user.lastName;
		req.session.userType = 'client';
		req.session.cookie.maxAge = expireTime;

		setUserDatabase(req);

		//Store client information in client collection
		await userdb.collection('info').insertOne({
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			phone: user.phone
		});

	//Submits info for business side forms
	} else if (type == "business") {

		//Validation schema for user inputs
		var schema = Joi.object(
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
		if (validationRes.error != null) {
			let doc = '<body><p>Invalid Signup</p><br><a href="/signup">Try again</a></body>';
			res.send(doc);
			return;
		}

		//hashes password for storing
		user.password  = await bcrypt.hash(user.password, saltRounds);

		//If the user select the services they provide it is stored in an array
		//This currently only functions for the single checkbox and would need to be adjusted for multiple service options
		user.services = [];
		if (Boolean(req.body.services)) {
			user.services.push(req.body.services);
		}

		await appUserCollection.insertOne({
			email: user.businessEmail,
			companyName: user.companyName,
			firstName: user.firstName,
			lastName: user.lastName,
			phone: user.businessPhone,
			password: hashPass,
			userType: 'business'
		});

		//Update the session for the now logged in user
		req.session.authenticated = true;
		req.session.email = user.companyEmail;
		req.session.name = user.companyName;
		req.session.userType = 'business';
		req.session.cookie.maxAge = expireTime;

		setUserDatabase(req);
		console.log(userdb);
		//Store business information in client collection
		await userdb.collection('info').insertOne({
			companyName: user.companyName,
			email: user.businessEmail,
			phone: user.businessPhone,
			services: user.services,
			firstName: user.firstName,
			lastName: user.lastName,
			companyWebsite: user.companyWebsite
		});
	}

	// //Update the session for the now logged in user
	// req.session.authenticated = true;
	// req.session.cookie.maxAge = expireTime;

	//Redirect to home
	res.redirect('/');
});

// Login routing
app.get('/login', (req, res) => {
	res.render('login.ejs', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType});
});

// Handling login subission information
app.post('/submitLogin', async (req, res) => {

	//save the given email and password from login
	email = req.body.email;
	password = req.body.password;

	// validation for entering a string, max 50 chars, and it's required
	const schema = Joi.string().email().required();
	const validationResult = schema.validate(email);
	if (validationResult.error != null) {
		res.redirect("/login");
		return;
	}

	// find a result for the client accounts first
	var result = await appUserCollection.find({ email: email }).project({ email: 1, companyName: 1, firstName: 1, lastName: 1, password: 1, userType: 1, _id: 1 }).toArray();

	// // if there are no clients, search through the admin accounts
	// if (result.length == 0) {
	// 	result = await adminsCollection.find({ businessEmail: email }).project({ email: 1, password: 1, _id: 1 }).toArray();
	// }
	if (result.length == 0) {
		var doc = '<p>No user found</p><br><a href="/login">Try again</a>';
		res.send(doc);
		return;
	}

	// check the passwords to see if they match. If they do, create a session for the user and send them to the
	if (await bcrypt.compare(password, result[0].password)) {
		req.session.authenticated = true;
		req.session.email = email;
		req.session.userType = result[0].userType;

		// Set session name to first+last if client, companyname if business
		if (req.session.userType == 'client') {
			req.session.name = result[0].firstName +' '+ result[0].lastName;
		} else if (req.session.userType == 'business') {
			req.session.name = result[0].companyName;
		}
		req.session.cookie.maxAge = expireTime;
		

		setUserDatabase(req);
		
		res.redirect('/'); // redirect to home page
		return;
	} else {

		// if the password is incorrect, say so
		res.render('errorMessage', { error: 'Password is incorrect' });
	}
});

app.get('/logout', (req,res) => {
	req.session.destroy();
	setUserDatabase(req);
	// console.log(userdb);
	res.render('logout');
});

//Client user profile page
app.get('/profile', sessionValidation, async(req, res) => {
	//bandaid fix so its easier to test (delete later)
	setUserDatabase(req);

	//upload the info of the user
	let user = await userdb.collection('info').findOne();

	//currently no profile page available for the business side
	if(req.session.userType == 'client'){
		let profilePic = user.profilePic;
		if(user.profilePic != ''){
			profilePic = cloudinary.url(user.profilePic);
		}
		res.render('clientProfile', {user: user, editting: false, profilePic: profilePic});
		return;
	} else {
		res.redirect('/');
	}

});

//Client user profile edit
app.get('/profile/edit', sessionValidation,  async(req, res) => {
	//bandaid fix so its easier to test (delete later)
	setUserDatabase(req);

	//upload the info of the user
	let user = await userdb.collection('info').findOne({email: req.session.email});

	//currently no profile page available for the business side
	if(req.session.userType == 'client'){
		let profilePic = user.profilePic;
		if(user.profilePic != ''){
			profilePic = cloudinary.url(user.profilePic);
		}

		//render client profile page but with editting set up
		res.render('clientProfile', {user: user, editting: true, profilePic: profilePic});
		return;
	} else {
		res.redirect('/');
	}

})

//Post for editting the profile
app.post('/profile/editting', upload.single('profilePic'), async(req, res) => {

	//delete old image
	let user = await userdb.collection('info').find({email: req.session.email}).project({profilePic: 1}).toArray();
	deleteUploadedImage(user[0].profilePic);
	
	//update database
	req.body.profilePic = await uploadImage(req.file);
	await userdb.collection('info').updateOne({email: req.session.email}, {$set: req.body});
	res.redirect('/profile');

});

app.use(express.static(__dirname + "/public"));

app.get('*', (req, res) => {
	res.status(404);
	res.render('errorMessage', { error: 'Page not found - 404' });
})

app.listen(port, () => {
	console.log("Node application listening on port " + port);
});