require("./utils.js");
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const ObjectId = require('mongodb').ObjectId;

const bcrypt = require('bcrypt');
const {Storage} = require('@google-cloud/storage');
const {Readable} = require('stream');
const multer = require("multer");
const stream = require("stream");
const cloudinary = require('cloudinary').v2;

const Swal = require('sweetalert2');

const saltRounds = 10;


//GOOGLE CLOUD STORAGE

//Take the credentials from the .env file and construct them into one const
const googleCredentials = {
  type: process.env.GOOGLE_TYPE,
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY,
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: process.env.GOOGLE_AUTH_URI,
  token_uri: process.env.GOOGLE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.UNIVERSE_DOMAIN,
};

const googleStorage = new Storage({ credentials: googleCredentials });
const bucketName = process.env.BUCKET_NAME;

//END OF GOOGLE CLOUD STORAGE

const nodemailer = require('nodemailer');
const crypto = require('crypto')
const app = express();
const port = process.env.PORT || 3000;
const Joi = require('joi');
const ejs = require('ejs');
const { content_v2_1 } = require("googleapis");

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

const autoreply_email = process.env.EMAIL_ADDRESS;
const autoreply_email_password = process.env.EMAIL_ADDRESS_PASSWORD;
/* END secret section */

// var { database } = include('databaseConnection');

//Creating a MongoClient and using it to connect to a specified database
const MongoClient = require("mongodb").MongoClient;
// let atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${database}?retryWrites=true`;
let appdb = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_appdb}?retryWrites=true`);

// This database is set when the user is logged in or signs up for the first time using setUserDatabase().
let userdb = '';
let trainerdb = '';

// ----- Collections -----
const appUserCollection = appdb.db(mongodb_appdb).collection('users');
// const clientsCollection = database.db(mongodb_database).collection('clientUsers');
// const adminsCollection = database.db(mongodb_database).collection('adminUsers');
// const accountCollection = database.db(mongodb_database).collection(req.session.username);
// This don't work ^

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

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
		res.redirect('/');
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
		res.render('errorMessage', { error: 'Not Authorized - 403', loggedIn: isValidSession(req), userType: req.session.userType });
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
			db = mongodb_businessdb + '-' + req.session.name.replace(/\s/g, "");
		}
		let userdbAccess = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${db}?retryWrites=true`);
		userdb = userdbAccess.db(db);
	}
}

// Allows access to the trainer's database when tied to a client
async function setTrainerDatabase(req) {
	if (!isClient(req)) {
		trainerdb = null;
	} else {
		let trainer = await appUserCollection.find({ email: req.session.email}).project({companyName: 1, _id: 1}).toArray();
		// Checking for if the client currently has a hired trainer.
		if (trainer[0].companyName == null || trainer[0].companyName == '' || trainer[0].companyName == undefined) {
			trainerdb = null;
		} else {
			let db = mongodb_businessdb + '-' + trainer[0].companyName.replace(/\s/g, "");
			let trainerdbAccess = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${db}?retryWrites=true`);
			trainerdb = trainerdbAccess.db(db);
		}
	}
}

//Upload files to Google Cloud
async function uploadFileToGoogleCloud(fileBuffer, fileName) {
    const bucket = googleStorage.bucket(bucketName);
    const file = bucket.file(fileName);
    const stream = Readable.from(fileBuffer);

    return new Promise((resolve, reject) => {
        stream.pipe(file.createWriteStream())
            .on('error', reject)
            .on('finish', () => {
                resolve(`gs://${bucketName}/${fileName}`);
            });
    });
}

//Upload files to drive function
async function uploadImage (fileObject, folder){
	//Pre: fileObject must be from req.file (user upload. (method from multer))
	//Post: returns the cloud url the image is now stored at
	let imageUrl;
	let buf64 = fileObject.buffer.toString('base64');
	await cloudinary.uploader.upload("data:image/png;base64," + buf64, {folder: folder}, function(error, result) { //_stream
		imageId = result.public_id;
  	});
  return imageId;
};

//delete images from the cloudinary storage
async function deleteUploadedImage(id){
	//Pre: id must be empty or a valid public_id from cloudinary
	//Post: image is deleted from cloudinary
	if(id != '' && id != null){
		cloudinary.uploader.destroy(id, (error) => {
			console.error(error);
		});
	}
}

// TODO: Add access to pages and create a check for the user type and authorization
// status to determine what footer and navbar to display

app.get('/', (req, res) => {
	setUserDatabase(req);
	setTrainerDatabase(req);
	res.render('index', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType});
});

app.get('/about', (req, res) => {
	res.render('about', {loggedIn: isValidSession(req), userType: req.session.userType});
});

app.get('/test', (req, res) => {
	res.render('test', {loggedIn: true, name: 'Test User', userType: 'business'});
});

app.get('/FAQ', (req, res) => {
	res.render('FAQ', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType});
});

app.get('/clientResources', (req, res) => {
	res.render('clientResources', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType});
});

app.get('/login/:loginType', (req, res) => {
	res.render(req.params.loginType, {loggedIn: isValidSession(req), loginType: req.params.loginType});
})

// I think this does nothing so I'll comment out, but delete later.
// app.get('/business/:action', (req, res) => {
// 	if(res.params.action == 'login'){
// 		res.render('businessLogin', {loggedIn: isValidSession(req), userType: req.session.userType});
// 	}
// })

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
			let doc = '<p>Invalid Signup</p><br><a href="/login/clientLogin">Try again</a></body>';
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
		req.session.name = user.firstName + ' ' + user.lastName;
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
				companyName: Joi.string().pattern(/^[a-zA-Z0-9\s']*$/).max(40).required(),
				businessEmail: Joi.string().email().required(),
				businessPhone: Joi.string().pattern(/^[0-9\s]*$/).length(10).required(),
				firstName: Joi.string().pattern(/^[a-zA-Z\s]*$/).max(20).required(),
				lastName: Joi.string().pattern(/^[a-zA-Z\s]*$/).max(20).required(),
				companyWebsite: Joi.string().pattern(/^(https?:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/),
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
			let doc = '<body><p>Invalid Signup</p><br><a href="/login/businessLogin">Try again</a></body>';
			res.send(doc);
			return;
		}

		//hashes password for storing
		user.password  = await bcrypt.hash(user.password, saltRounds);

		//If the user select the services they provide it is stored in an array
		//This currently only functions for the single checkbox and would need to be adjusted for multiple service options
		user.services = [];
		if (Boolean(req.body.services)) {
			if(Array.isArray(req.body.services)){
				for(let i = 0; i < req.body.services.length; i++){
					user.services.push(req.body.services[i]);
				}
			} else {
				user.services.push(req.body.services);
			}
			
		}

		await appUserCollection.insertOne({
			email: user.businessEmail,
			companyName: user.companyName,
			firstName: user.firstName,
			lastName: user.lastName,
			phone: user.businessPhone,
			password: user.password,
			userType: 'business'
		});

		//Update the session for the now logged in user
		req.session.authenticated = true;
		req.session.email = user.companyEmail;
		req.session.name = user.companyName;
		req.session.userType = 'business';
		req.session.cookie.maxAge = expireTime;

		setUserDatabase(req);
		//Store business information in client collection
		await userdb.collection('info').insertOne({
			companyName: user.companyName,
			email: user.businessEmail,
			phone: user.businessPhone,
			services: user.services,
			companyWebsite: user.companyWebsite
		});

		//Store business owner information in client collection
		await userdb.collection('trainer').insertOne({
			companyName: user.companyName,
			firstName: user.firstName,
			lastName: user.lastName
		});
	}

	// //Update the session for the now logged in user
	// req.session.authenticated = true;
	// req.session.cookie.maxAge = expireTime;

	//Redirect to home
	res.redirect('/');
});

// Deprecated: Will probable delete
// app.get('/login', (req, res) => {
// 	res.render('login', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType});
// });

// Handling login subission information
app.post('/submitLogin', async (req, res) => {

	//save the given email and password from login
	email = req.body.email;
	password = req.body.password;

	// validation for entering a string, max 50 chars, and it's required
	const schema = Joi.string().email().required();
	const validationResult = schema.validate(email);
	if (validationResult.error != null) {
		res.redirect("/");
		return;
	}

	// find a result for the client accounts first
	var result = await appUserCollection.find({ email: email }).project({ email: 1, companyName: 1, firstName: 1, lastName: 1, password: 1, userType: 1, _id: 1 }).toArray();

	// // if there are no clients, search through the admin accounts
	// if (result.length == 0) {
	// 	result = await adminsCollection.find({ businessEmail: email }).project({ email: 1, password: 1, _id: 1 }).toArray();
	// }
	if (result.length == 0) {
		var doc = '<p>No user found</p><br><a href="/">Try again</a>';
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
			req.session.name = result[0].firstName + ' ' + result[0].lastName;
		} else if (req.session.userType == 'business') {
			req.session.name = result[0].companyName;
		}
		req.session.cookie.maxAge = expireTime;
		

		setUserDatabase(req);

		res.redirect('/loggedIn'); // redirect to home page
		return;
	} else {

		// if the password is incorrect, say so
		res.render('errorMessage', {loggedIn: isValidSession(req), userType: req.session.userType, error: 'Password is incorrect' });
	}
});

app.get('/loggedIn', (req, res) => {
	res.redirect('/');
});

// forget password (link it after) -> enter email -> get email (in progress) -> make a password -> 
// This is the reset password landing page where the user can enter their email for a reset

// This function is solely for sending emails. It will need an ejs file for the email templating later
function sendMail(emailAddress, resetToken) {
	ejs.renderFile('./views/email.ejs', { resetToken: resetToken }, (err, str) => {
		if (err) {
			console.error('Error rendering email template', err);
			return;
		}

		// Custom settings for the mail
		const mailOptions = {
			from: `${autoreply_email}`,
			to: emailAddress,
			subject: 'Reset Pawfolio password',
			html: str
		};

		// This uses the transporter object near the top of the file to send emails
		transporter.sendMail(mailOptions, (error, info) => {

			// Error handling
			if (error) {
				res.render('errorMessge', { error: 'Email couldn\'t be sent', loggedIn: false, userType: null })
			}
		});
	});
}

// This routing is the main page for forgetting your password.
app.get('/forgotPassword', (req, res) => {

	// If the email is invalid, the query will have an error message. Otherwise, we want it blank so it doesn't always show
	const errorMessage = req.query.errorMessage || '';
	res.render('forgotPassword', { errorMessage: errorMessage, loggedIn: false, userType: null});
});

// This handles the submitted email for the /forgotpassword routing
app.post('/emailConfirmation', async (req, res) => {

	// deciding what collection the user is in (WILL BE REMOVED)
	let emailVerification = false;

	// Storing the email that was entered
	email = req.body.email;

	// if the email is found in the client side, we are allowed to send an email 
	emailValidation = await appUserCollection.find({ email: email }).project({ email: 1, password: 1, _id: 1 }).toArray();
	if (emailValidation.length == 1) {
		emailVerification = true;
	}

	// if the email exists in the database
	if (emailVerification) {
		// Create a unique token and 1 hour expiration limit using crypto
		const token = crypto.randomBytes(20).toString('hex');
		const PasswordResetToken = token;
		const tokenExpiriationDate = Date.now() + 3600000;

		// Gives the user information collection the token and expiration time
		appUserCollection.updateOne({ email: email }, {
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
	const clientUser = await appUserCollection.findOne({ resetToken: token.token });

	// This detects if we couldn't find the token in any user
	if (clientUser == null) {
		res.render('errorMessage', { error: 'Token expired or invalid.', loggedIn: false, userType: null })
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
	res.render('resetPasswordForm', { token: token.token, loggedIn: false, userType: null });
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
	appUserCollection.updateOne({ resetToken: token.token }, { $set: { password: passwordHashed } });

	// deletes the token information so that it can no longer be accessed on accident or injection
	appUserCollection.updateOne(
		{ resetToken: token.token },
		{ $unset: { resetToken: "", tokenExpiration: "" } }

	);

	res.redirect('/passwordChangedSuccessfully');
});

// This is a page for when your password is successfully changed
app.get('/passwordChangedSuccessfully', (req, res) => {
	res.render('passwordChangedSuccessfully', {loggedIn: isValidSession(req), userType: req.session.userType});
});

app.get('/emailSent', (req, res) => {
	res.render('checkInbox', {loggedIn: isValidSession(req), userType: req.session.userType});
});

app.get('/logout', (req, res) => {
	req.session.destroy();
	setUserDatabase(req);
	// res.render('logout', {loggedIn: false, userType: null});
	res.redirect('/');
});

//Async function for uploading an immage

//Client user profile page
app.get('/profile', sessionValidation, async(req, res) => {
	//bandaid fix so its easier to test (delete later)
	setUserDatabase(req);

	//upload the info of the user
	let user = await userdb.collection('info').findOne();

	//Client profile page
	if(req.session.userType == 'client'){
		//Collect profile pic link if there is one
		if(user.profilePic != ''){
			user.profilePic = cloudinary.url(user.profilePic);
		}

		//Gather dogs and their images if they have one
		let dogs = await userdb.collection('dogs').find({}).toArray();
		for(let i = 0; i < dogs.length; i++){
			let pic = dogs[i].dogPic;
			if(pic != ''){
				dogs[i].dogPic = cloudinary.url(pic);
			}
		}

		//Render client profile page
		res.render('clientProfile', {loggedIn: isValidSession(req), user: user, dogs: dogs, userName: req.session.name, userType: req.session.userType});
		return;

	//Business user profile
	} else {
		//Collect programs
		let programs = await userdb.collection('programs').find({}).toArray();

		//Collect logo link if there is one
		if(user.logo != ''){
			user.logo = cloudinary.url(user.logo);
		}

		//Collect business' trainer and their profile pic if there is one
		let trainer = await userdb.collection('trainer').findOne();
		if(trainer.trainerPic != ''){
			trainer.trainerPic = cloudinary.url(trainer.trainerPic);
		}

		//Start on different tabs depending on the req.query
		if(req.query.tab == 'trainer'){
			res.render('businessProfile', {loggedIn: isValidSession(req), business: user, trainer: trainer, programs: programs, businessTab: '', trainerTab: 'checked', programsTab: '', userType: req.session.userType});
		} else if(req.query.tab == 'program'){
			res.render('businessProfile', {loggedIn: isValidSession(req), business: user, trainer: trainer, programs: programs, businessTab: '', trainerTab: '', programsTab: 'checked', userType: req.session.userType});
		} else {
			res.render('businessProfile', {loggedIn: isValidSession(req), business: user, trainer: trainer, programs: programs, businessTab: 'checked', trainerTab: '', programsTab: '', userType: req.session.userType});
		}
	}
});

//Profile Editting (both client and business)
app.post('/profile/edit/:editType', sessionValidation, upload.array('accountUpload', 1), async(req, res) => {
	//bandaid fix so its easier to test (delete later)
	setUserDatabase(req);

	//Edit client profile
	if(req.params.editType == 'clientProfile'){

		//grab current image id
		let user = await userdb.collection('info').find({email: req.session.email}).project({profilePic: 1}).toArray();	

		//Image id is updated with a newly upload image or kept the same
		if(req.files.length != 0){
			await deleteUploadedImage(user[0].profilePic);
			req.body.profilePic = await uploadImage(req.files[0], "clientAccountAvatars");
		} else {
			req.body.profilePic = user[0].profilePic;
		}

		//Update the database
		await userdb.collection('info').updateOne({email: req.session.email}, {$set: req.body});

		//Return to profile
		res.redirect('/profile');

	//Edit business profile -> business details
	} else if (req.params.editType == 'businessDetails'){

		//Grab current logo id
		let business = await userdb.collection('info').find({companyName: req.session.name}).project({logo: 1}).toArray();

		//Logo id is updated with a newly upload logo or kept the same
		if(req.files.length != 0){
			await deleteUploadedImage(business[0].logo);
			req.body.logo = await uploadImage(req.files[0], "businessLogos");
		} else {
			req.body.logo - business[0].logo;
		}

		//update database
		await userdb.collection('info').updateOne({companyName: req.session.name}, {$set: req.body});

		//Return to profile, business details tab
		res.redirect('/profile?tab=business');

	//Edit business profile -> trainer profile
	} else if(req.params.editType == 'trainer'){

		//Grab current profile pic id
		let trainer = await userdb.collection('trainer').find({companyName: req.session.name}).project({trainerPic: 1}).toArray();

		//Profile pic id is updated with a newly upload Profile pic or kept the same
		if(req.files.length != 0){
			await deleteUploadedImage(trainer[0].trainerPic);
			req.body.trainerPic = await uploadImage(req.files[0], "trainerAvatars");
		} else {
			req.body.trainerPic - trainer[0].trainerPic;
		}

		//Update database
		await userdb.collection('trainer').updateOne({companyName: req.session.name}, {$set: req.body});

		//Return to profile, trainer profile tab
		res.redirect('/profile?tab=trainer');
	
	//Edit business profile -> Programs (can only add a program from profile page)
	} else if(req.params.editType == 'addProgram'){

		//Set up program from submitted information 
		let program = {
			name: req.body.name,
			pricing: {
				priceType: req.body.priceType,
				price: req.body.price
			},
			discount: req.body.discounts,
			hours: req.body.hours,
			description: req.body.description
		}

		//Insert program into database
		await userdb.collection('programs').insertOne(program);

		//Return to profile, programs tab
		res.redirect('/profile?tab=program');
	}

});

//Display specific program
app.get('/program/:programId', async(req, res) => {
	//bandaid fix so its easier to test (delete later)
	setUserDatabase(req);

	//Use program id to access program
	let programId =  ObjectId.createFromHexString(req.params.programId);
	let program = await userdb.collection('programs').find({_id: programId}).toArray();

	//Render program page with the specific program details
	res.render('programDetails', {loggedIn: isValidSession(req), userType: req.session.userType, program: program[0]});
});

//Edit specific program
app.post('/program/:programId/edit', async(req, res) => {
	//bandaid fix so its easier to test (delete later)
	setUserDatabase(req);

	//Set up program with submitted info
	let = program = {
		name: req.body.name,
		pricing: {
			priceType: req.body.priceType,
			price: req.body.price
		},
		discount: req.body.discounts,
		hours: req.body.hours,
		description: req.body.description
	}

	//Use program id to update program with new details
	let programId =  ObjectId.createFromHexString(req.params.programId);
	await userdb.collection('programs').updateOne({_id: programId}, {$set: program});

	//Return to specific program page
	res.redirect('/program/' + req.params.programId);
});

//Form for adding a new dog
app.get('/addDog', (req, res) => {
	res.render('addDog', {loggedIn: isValidSession(req), userType: req.session.userType});
});

//Adds the dog to the database
app.post('/addingDog', upload.array('dogUpload', 6), async (req, res) => {
    setUserDatabase(req); // bandaid for testing

	//validation schema
	var schema = Joi.object(
		{
			dogName: Joi.string().pattern(/^[a-zA-Z\s]*$/).max(20),
			specialAlerts: Joi.string().pattern(/^[A-Za-z0-9 _.,!"'()#;:\s]*$/).allow(null, '')
		}
	);

	if(!req.body.specialAlerts){
		req.body.specialAlerts = '';
	}

	let validationRes = schema.validate({dogName: req.body.dogName, specialAlerts: req.body.specialAlerts});
    // Deals with errors from validation
    if (validationRes.error != null) {
        let doc = '<body><p>Invalid Dog</p><br><a href="/addDog">Try again</a></body>';
        res.send(doc);
        return;
    }

    // create a dog document
    let dog = {
        dogName: req.body.dogName
    };

    // this is the file management stuff
    if (req.files.length != 0) {
        // Check if the first image is an image file and upload the image if it is
        let filename = req.files[0].mimetype;
        filename = filename.split('/');
        let fileType = filename[0];

        // If the first file is an image, upload it to Cloudinary
        if (fileType == 'image') {
            dog.dogPic = await uploadImage(req.files[0], 'dogPics');
        } else {
            dog.dogPic = '';
        }

        // Loop through all files and upload PDFs to Google Cloud Storage
        let v = 0;
        for (let i = 0; i < req.files.length; i++) {
            let vaccineType;
            
            // Check if you have one or multiple vaccines to upload
            if (Array.isArray(req.body.vaccineCheck)) {
                vaccineType = req.body.vaccineCheck[v]; // We put v here because the first iteration (i) might be the profile photo image
            } else {
                vaccineType = req.body.vaccineCheck;
            }
            
            let filename = req.files[i].mimetype;
            filename = filename.split('/');
            let fileType = filename[0];
            let dogName = req.body.dogName;
            
            // Iterate v so that we can get the number of vaccines
            // This accounts for the potential profile photo upload
            if(fileType != 'image') {
                v++;
            }
            
            // Get the last name of the client
            let lastName = req.session.name.split(' ')[1];

            if (fileType === 'application') {
                let fullFileName = `${lastName}_${dogName}_${vaccineType}.pdf`;
                let filePath = `pdfs/${fullFileName}`;
                let fileUrl = await uploadFileToGoogleCloud(req.files[i].buffer, filePath);
                dog.vaccineRecords = dog.vaccineRecords || [];
                dog.vaccineRecords.push({ fileName: req.files[i].originalname, fileUrl });
            }
        }
    } else {
        dog.dogPic = '';
    }

	//stores the neutered status
	if(req.body.neuteredStatus == 'neutered'){
		dog.neuteredStatus = req.body.neuteredStatus;
	} else {
		dog.neuteredStatus = 'not neutered';
	}
	
	//Stores sex, birthday, weight, specialAlerts of the dog
	dog.sex = req.body.sex;
	dog.birthday = req.body.birthday;
	dog.weight = req.body.weight;
	dog.specialAlerts = req.body.specialAlerts;

	//Creates documents in the dog document for each vaccine
	let allVaccines = ['rabies', 'leptospia', 'bordatella', 'bronchiseptica', 'DA2PP'];
	allVaccines.forEach((vaccine)=>{
		eval('dog.' + vaccine + '= {}');
	});

    // If dog has more than one vaccine, add the expiration date and pdf of the proof of vaccination to the specific vaccine document
    if (Array.isArray(req.body.vaccineCheck)) {
        req.body.vaccineCheck.forEach((vaccine) => {
            dog[vaccine] = {
                expirationDate: req.body[vaccine + 'Date'],
                vaccineRecord: req.body[vaccine + 'Proof']
            };
        });
    } else if (req.body.vaccineCheck) {
        dog[req.body.vaccineCheck] = {
            expirationDate: req.body[req.body.vaccineCheck + 'Date'],
            vaccineRecord: req.body[req.body.vaccineCheck + 'Proof']
        };
    }
	
	//Insert the dog into the database and return to profile
    await userdb.collection('dogs').insertOne(dog);
    res.redirect('/profile');
});

//Show specific dog
app.get('/dog/:dogId', async(req, res) => {
	setUserDatabase(req); //bandaid for testing

	//Use the dog document id to find the specific dog
	let dogId =  ObjectId.createFromHexString(req.params.dogId);
	let dogRecord = await userdb.collection('dogs').find({_id: dogId}).toArray();

	//If there is a dog pic attached to this dog, create a link to it
	if(dogRecord[0].dogPic != ''){
		dogRecord[0].dogPic = cloudinary.url(dogRecord[0].dogPic);
	}

	//Render the dog's profile
	res.render('dogProfile', {loggedIn: isValidSession(req), userType: req.session.userType, dog: dogRecord[0]});
});

//Edit specific dog
app.post('/dog/:dogId/edit',upload.single('dogUpload'), async(req, res) => {

	//Create the Id object from the dog id
	let dogId =  ObjectId.createFromHexString(req.params.dogId);

	//grab current image id
	let dog = await userdb.collection('dogs').find({_id: dogId}).project({dogPic: 1}).toArray();	

	//If a new image was submitted, delete the old one and upload it
	if(req.file){
		await deleteUploadedImage(dog[0].dogPic);
		req.body.dogPic = await uploadImage(req.file, "clientAccountAvatars");
	} else {
		req.body.dogPic = dog[0].dogPic;
	}

	//Update the dog's information
	await userdb.collection('dogs').updateOne({_id: dogId}, {$set: req.body});

	//Redirect back to the dog's profile
	let redirect = '/dog/' + req.params.dogId;
	res.redirect(redirect);
});

//Delete specific dog
app.post('/dog/:dogId/delete',upload.single('dogUpload'), async(req, res) => {
	//Create the Id object from the dog id
	let dogId =  ObjectId.createFromHexString(req.params.dogId);

	//grab current image id
	let dog = await userdb.collection('dogs').find({_id: dogId}).project({dogPic: 1}).toArray();	
	
	//If there is an image attached to this dog, delete it
	if(dog[0].dogPic != ''){
		deleteUploadedImage(dog[0].dogPic);
	}

	//Delete the dog from the mongodb database
	await userdb.collection('dogs').deleteOne({_id: dogId});

	//Return to user profile
	res.redirect('/profile');
});

app.get('/accountDeletion', (req, res) => {
	res.render('accountDeletion', {loggedIn: isValidSession(req), name: req.session.name , userType: req.session.userType});
});

app.post('/deleteAccount', async (req, res) => {

	// Store the email
	let email = req.session.email;

	// Logic for business accounts and clients (safe coding)
	if (req.session.userType == 'client') {
		await trainerdb.collection('clients').deleteOne({email: email});
		await appUserCollection.deleteMany({email: email, userType: 'client'});
	} else if (req.session.userType == 'business') {
		let companyName = req.session.name;
		await appUserCollection.updateMany({companyName: companyName}, {set:{companyName: null}});
		await appUserCollection.deleteMany({email: email, userType: 'business'});
	}
	await userdb.dropDatabase();

	res.redirect('/logout');
});


app.get('/findTrainer', async(req, res) => {
	//Grab all business users
	let businesses = await appUserCollection.find({userType: 'business'}).project({companyName: 1}).toArray();

	//Arrays that will hold all business details and trainers
	let businessDetails = [];
	let businessTrainers = [];
	
	//Fetch the business details and trainers for every business user
	for(let i = 0; i < businesses.length; i++){
		//Key is the business name
		let name = businesses[i].companyName;

		//Establish connection the user database
		let db = mongodb_businessdb + '-' + name.replace(/\s/g, "");
		let userdbAccess = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${db}?retryWrites=true`);
		let tempUser = userdbAccess.db(db);

		//Query for the info and trainer
		let info = await tempUser.collection('info').find({companyName: name}).toArray();
		let trainer = await tempUser.collection('trainer').find({companyName: name}).toArray();

		//convert the logo picture id to a link if a logo has been uploaded
		if(info[0].logo != '' && info[0].logo != null){
			info[0].logo = cloudinary.url(info[0].logo);
		}

		//Create a keyword string containing the trainer's name, company name and all the services
		info[0].searchString = info[0].companyName + '/' + trainer[0].firstName +'/' + trainer[0].lastName;
		for(let i=0; i < info[0].services.length; ++i){
			info[0].searchString += info[0].services[i] + '/';
		}

		//Convert the search string to lowercase to avoid case sensitivity
		info[0].searchString = info[0].searchString.replace(' ','').toLowerCase();

		//Add the information to each array
		businessDetails.push(info[0]);
		businessTrainers.push(trainer[0]);
	}

	res.render('viewTrainers', {loggedIn: isValidSession(req), userType: req.session.userType, businesses: businessDetails, trainers: businessTrainers});
});

//Temporary code from calendar testing; changed address to just /trainer
app.get('/trainer', async (req, res) => {
	const trainers = await appUserCollection.find({ userType: 'business' }).project({ _id: 1, companyName: 1 }).toArray();
	res.render('findTrainer', {loggedIn: isValidSession(req), userType: req.session.userType, trainers: trainers});
});

//View indivdual business
app.get('/viewBusiness/:company', async(req, res) => {
	//Connect to the specific business' database
	let db = mongodb_businessdb + '-' + req.params.company.replace(/\s/g, "");
	let userdbAccess = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${db}?retryWrites=true`);
	let tempUser = userdbAccess.db(db);

	//Business is a object with three other objects
	let business = await (async () => {
		//Promise concurrently queries the database for the three collections
		let [info, trainer, programs] = await Promise.all([
			tempUser.collection('info').find({}).toArray(),
			tempUser.collection('trainer').find({}).toArray(),
			tempUser.collection('programs').find({}).toArray()
		]);
		//Returns the query result
		return {
			info: info[0],
			trainer: trainer[0],
			programs: programs
		};
	})();

	//If there is a logo, grab its link
	if(business.info.logo != '' && business.info.logo != null){
		business.info.logo = cloudinary.url(business.info.logo);
	}

	//If there is a profile pic for the trainer, grab its link
	if(business.trainer.trainerPic != '' && business.trainer.trainerPic  != null){
		business.trainer.trainerPic  = cloudinary.url(business.trainer.trainerPic );
	}
	
	res.render('clientViewTrainer', {loggedIn: isValidSession(req), userType: req.session.userType, business: business.info, trainer: business.trainer, programs: business.programs});
});

// Temporary add Trainer button for this Branch
app.post('/addTrainer/:trainer', async (req, res) => {
	let trainer = req.params.trainer;
	await appUserCollection.updateOne({email: req.session.email}, {$set: { companyName: trainer}});

	await setTrainerDatabase(req);

	let client = await userdb.collection('info').find().project({email: 1, firstName: 1, lastName: 1, phone: 1}).toArray();

	trainerdb.collection('clients').insertOne(client[0]);

	res.redirect('/');
});
// ----------------- CALENDAR STUFF GOES HERE -------------------
async function getUserEvents(req) {
	let userEvents;
	if (req.session.userType == 'business') {
		userEvents = await userdb.collection('eventSource').find().project({ _id: 1, title: 1, client: 1, start: 1, end: 1, info: 1}).toArray();
	} else if (req.session.userType == 'client') {
		if (trainerdb == null || trainerdb == '' || trainerdb == undefined) {
			userEvents = null;
		} else {
			userEvents = await trainerdb.collection('eventSource').find().project({ _id: 1, title: 1, client: 1, start: 1, end: 1, info: 1}).toArray();
		}
	}
	return userEvents;
}

app.get('/calendar', async (req, res) => {
	setUserDatabase(req);
	await setTrainerDatabase(req);
	if (req.session.userType == 'business') {
		res.render('calendarBusiness', {loggedIn: isValidSession(req), userType: req.session.userType});
		return;
	} else if (req.session.userType == 'client') {
		res.render('calendarClient', {loggedIn: isValidSession(req), userType: req.session.userType});
	}
	
});

// Returns all events to the calendar
app.get('/events', async (req, res) => {
	const events = await getUserEvents(req);
	res.json(events);
});

app.post('/getThisEvent', async (req, res) => {
	let event = {
		title: req.body.title,
		start: req.body.start,
		end: req.body.end
	}
	let result = await userdb.collection('eventSource').find(event).project({_id: 1, client: 1, info: 1}).toArray();
	res.json(result);
});

// Returns client list to the calendar
app.post('/getClients', async (req, res) => {
	const clientList = await userdb.collection('clients').find().project({ email: 1, _id: 1 }).toArray();
	res.json(clientList);
});

app.post('/addEvent', async (req, res) => {
	let date = req.body.calModDate;
	let startDate = date + "T" + req.body.calModStartHH + ":" + req.body.calModStartMM + ":00";
	let endDate = date + "T" + req.body.calModEndHH + ":" + req.body.calModEndMM + ":00";
	let clientEmail = req.body.calModClient;
	let eventInfo = req.body.calModInfo;
	let event = {
		title: req.body.calModTitle,
		start: startDate,
		end: endDate,
		client: clientEmail,
		info: eventInfo
	};

	// Check for duplicate event
	let check = userdb.collection('eventSource').find({
		event: event.title,
		start: event.start,
		end: event.end,
		client: event.client
	}).project({_id: 1}).toArray(); //Check for everything but info

	if (check.length > 0) {
		// TODO DUPE ERROR EXIT HERE
	} else {
		await userdb.collection('eventSource').insertOne(event);
	}

	res.redirect('/calendar');
});

app.post('/updateEvent', async (req, res) => {
	let date = req.body.calModDate;
	let startNew = date + "T" + req.body.calModStartHH + ":" + req.body.calModStartMM + ":00";
	let endNew = date + "T" + req.body.calModEndHH + ":" + req.body.calModEndMM + ":00";
	let eventOrig = {
		title: req.body.calModTitleOrig,
		start: req.body.calModStartOrig,
		end: req.body.calModEndOrig,
		client: req.body.calModEmailOrig,
		info: req.body.calModInfoOrig
	}

	let eventNew = {
		title: req.body.calModTitle,
		start: startNew,
		end: endNew,
		client: req.body.calModEmail,
		info: req.body.calModInfo
	}

	await userdb.collection('eventSource').updateOne({
		title: eventOrig.title,
		start: eventOrig.start,
		end: eventOrig.end,
		client: eventOrig.client,
		info: eventOrig.info
	}, {
		$set: {
			title: eventNew.title,
			start: eventNew.start,
			end: eventNew.end,
			client: eventNew.client,
			info: eventNew.info
		}
	});

	// update using _id, but doesn't work
	// let eventID = req.body.calModEventID;
	// console.log(eventID);
	// await userdb.collection('eventSource').updateOne({ _id: eventID }, { $set: {eventNew} });

	res.redirect('/calendar');
});

app.post('/removeEvent', async (req, res) => {

	// Delete by _id, but doesn't work
	// let eventID = req.body.calModEventID;
	// await userdb.collection('eventSource').deleteOne({ _id: eventID});

	let calTitle = req.body.calModTitleOrig;
	let calStart = req.body.calModStartOrig;
	let calEnd = req.body.calModEndOrig;
	let calEmail = req.body.calModEmailOrig;
	let calInfo = req.body.calModInfoOrig;

	await userdb.collection('eventSource').deleteOne({
		title: calTitle,
		start: calStart,
		end: calEnd,
		client: calEmail,
		info: calInfo
	});
	res.redirect('/calendar');
});

// ----------------- CALENDAR SECTION ENDS HERE -------------------

app.use(express.static(__dirname + "/public"));

app.get('*', (req, res) => {
	res.status(404);
	res.render('errorMessage', { error: 'Page not found - 404', loggedIn: isValidSession(req), userType: req.session.userType});
})

app.listen(port, () => {
	console.log("Node application listening on port " + port);
});