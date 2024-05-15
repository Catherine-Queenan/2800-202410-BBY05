require("./utils.js");
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const nodemailer = require('nodemailer');
const crypto = require('crypto')
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

const autoreply_email = process.env.EMAIL_ADDRESS;
const autoreply_email_password = process.env.EMAIL_ADDRESS_PASSWORD;
/* END secret section */

var { database } = include('databaseConnection');

// ----- Collections -----
const clientsCollection = database.db(mongodb_database).collection('clientUsers');
const adminsCollection = database.db(mongodb_database).collection('adminUsers');
// const accountCollection = database.db(mongodb_database).collection(req.session.username);
// This don't work ^

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/sessions`,
	crypto: {
		secret: mongodb_session_secret
	}
});

// Creating the transporter object in order to login to the noreply email and send emails 
const transporter = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: autoreply_email,
		pass: autoreply_email_password
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

function sessionValidation(req, res, next) {
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

function adminAuthorization(req, res, next) {
	if (!isAdmin(req)) {
		res.status(403);
		res.render('errorMessage', { error: 'Not Authorized - 403' });
	} else {
		next();
	}
}



app.get('/', (req, res) => {
	res.render('index');
});

app.get('/about', (req, res) => {
	res.render('about');
});

//Page to choose what account to sign up for (business or client)
app.get('/signup', (req, res) => {
	res.render('signupChoice')
});

//Renders form for business or client sign up
app.get('/signup/:form', (req, res) => {
	let form = req.params.form;
	if (form == "business") {
		res.render('signUpAdmin.ejs');
	} else if (form == "client") {
		res.render('signUpClient.ejs');
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

		//Store client information in client collection
		await clientsCollection.insertOne({
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			phone: user.phone,
			password: hashPass
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
		var hashPass = await bcrypt.hash(user.password, saltRounds);

		//If the user select the services they provide it is stored in an array
		//This currently only functions for the single checkbox and would need to be adjusted for multiple service options
		user.services = [];
		if (Boolean(req.body.services)) {
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

// Login routing
app.get('/login', (req, res) => {
	res.render('login.ejs')
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
	var result = await clientsCollection.find({ email: email }).project({ email: 1, password: 1, _id: 1 }).toArray();

	// if there are no clients, search through the admin accounts
	if (result.length == 0) {
		result = await adminsCollection.find({ businessEmail: email }).project({ email: 1, password: 1, _id: 1 }).toArray();
	}
	if (result.length == 0) {
		var doc = '<p>Invalid Signup</p><br><a href="/signup">Try again</a>';
		res.send(doc);
		return;
	}

	// check the passwords to see if they match. If they do, create a session for the user and send them to the
	if (await bcrypt.compare(password, result[0].password)) {
		req.session.authenticated = true;
		req.session.email = email;
		req.session.cookie.maxAge = expireTime;

		res.redirect('/'); // redirect to home page
		return;
	} else {

		// if the password is incorrect, say so
		res.render('errorMessage', { error: 'Password is incorrect' });
	}
});

// forget password (link it after) -> enter email -> get email (in progress) -> make a password -> 
// This is the reset password landing page where the user can enter their email for a reset

// This function is solely for sending emails. It will need an ejs file for the email templating later
function sendMail(emailAddress, resetToken) {
	emailHTMLinsert =`<h1>localhost:3000/resetPassword/${resetToken}</h1>`;
	// Custom settings for the mail
	const mailOptions = {
		from: `${autoreply_email}`,
		to: emailAddress,
		subject: 'Reset Pawfolio password',
		html: emailHTMLinsert
	};

	// This uses the transporter object near the top of the file to send emails
	transporter.sendMail(mailOptions, (error, info) => {

		// Error handling
		if (error) {
			res.render('errorMessge', { error: 'Email couldn\'t be sent' })
		}
		console.log('successfuly sent email')
	});
}

// This routing is the main page for forgetting your password.
app.get('/forgotPassword', (req, res) => {

	// If the email is invalid, the query will have an error message. Otherwise, we want it blank so it doesn't always show
	const errorMessage = req.query.errorMessage || '';
	res.render('forgotPassword', {errorMessage: errorMessage});
});

// This handles the submitted email for the /forgotpassword routing
app.post('/emailConfirmation', async (req, res) => {

	// deciding what collection the user is in (WILL BE REMOVED)
	emailVerification = '';

	// Storing the email that was entered
	email = req.body.email;
	
	// if the email is found in the client side, we are allowed to send an email (WILL BE REMOVED)
	emailValidation = await clientsCollection.find({email: email}).project({ email: 1, password: 1, _id: 1 }).toArray();
	if(emailValidation.length == 1) {
		emailVerification = 'client';
	}
	// if the email is found in the business side, we are allowed to send an email (WILL BE REMOVED)
	emailValidation = await adminsCollection.find({email: email}).project({ email: 1, password: 1, _id: 1 }).toArray();
	if(emailValidation.length == 1) {
		emailVerification = 'admin';
	}

	// (WILL ONLY HAVE 1 CONDITION)
	if(emailVerification == 'client' || emailVerification == 'admin') {

		// Create a unique token and 1 hour expiration limit using crypto
		const token = crypto.randomBytes(20).toString('hex');
		const PasswordResetToken = token;
		const tokenExpiriationDate = Date.now() + 3600000;

		// Gives the user's information collection the token and expiration
		if (emailVerification == 'client') {

			clientsCollection.updateOne({ email: email }, { 
				$set: { 
					resetToken: `${PasswordResetToken}`, 
					tokenExpiration: `${tokenExpiriationDate}` 
				} 
			});

			// send the email with the unique token link
			sendMail(email, token);

			// Redirect to an email sent page
			res.redirect('/emailSent');
			return;
		}

		// Same as above (WILL BE REMOVED)
		if (emailVerification == 'admin') {

			adminCollection.updateOne({ email: email }, { 
				$set: { 
					resetToken: `${PasswordResetToken}`, 
					tokenExpiration: `${tokenExpiriationDate}` 
				} 
			});

			sendMail(email, token);
			res.redirect('/emailSent');
			return;
		}
	}

	// This is a custom error message for if the email is invalid
	// This does not have anything to do with the errorMessage.ejs file, this is simply for query
	const error = 'woof woof woof woof (not a valid email)';

	// the encodeURIComponent ensures that any special characters make it into the query if necessary
    res.redirect(`/forgotPassword?errorMessage=${encodeURIComponent(error)}`);
});

app.get('/resetPassword/:token', async (req, res) => {

	// refer to the token using token.token
	const token = req.params;

	// find and store the user and store their document for later verification
	const clientUser = await clientsCollection.findOne({resetToken: token.token});

	// This detects if we couldn't find the token in any user
	if (clientUser == null) {
		res.render('errorMessage', {error: 'Token expired or invalid.'})
		return;
	}

	// checks if the url token is valid and not expired. 
	if (clientUser.resetToken == token.token && clientUser.tokenExpiration > Date.now()) {
		res.redirect(`/resetPasswordForm/${token.token}`);
		return;
	}
});

// This routes to the form where the new user password would be submitted
app.get('/resetPasswordForm/:token', (req, res) => {

	// store the token
	token = req.params;
	res.render('resetPasswordForm', {token: token.token});
});

// Handles the new password submission
app.post('/resettingPassword/:token', async (req, res) => {
	
	// store the new password
	let password = req.body.password;

	// validate using the same schema config from the signup
	const schema = Joi.string().max(20).min(2).required();
	if (schema.validate(password).error != null) {
		res.redirect('/resetPasswordForm/:token');
	}

	// hash the password just like in the signup
	passwordHashed = await bcrypt.hash(password, saltRounds);

	// sets the new password based on the account with the token
	clientsCollection.updateOne({resetToken: token.token}, { $set: {password: passwordHashed}});

	// deletes the token information so that it can no longer be accessed on accident or injection
	clientsCollection.updateOne(
		{ resetToken: token.token },
		{ $unset: { resetToken: "", tokenExpiration: "" } }
	);

	res.redirect('/passwordChangedSuccessfully');
});

// This is a page for when your password is successfully changed
app.get('/passwordChangedSuccessfully', (req, res) => {
	res.render('passwordChangedSuccessfully');
});

app.get('/emailSent', (req, res) => {
	res.send('email sent');
});

app.get('/logout', (req,res) => {
	req.session.destroy();
	res.render('logout');
});

app.use(express.static(__dirname + "/public"));

app.get('*', (req, res) => {
	res.status(404);
	res.render('errorMessage', { error: 'Page not found - 404' });
})

app.listen(port, () => {
	console.log("Node application listening on port " + port);
});