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
	if(id != ''){
		cloudinary.uploader.destroy(id, (error) => {
			console.error(error);
		});
	}
}

// TODO: Add access to pages and create a check for the user type and authorization
// status to determine what footer and navbar to display

app.get('/', (req, res) => {
	setUserDatabase(req);
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
			user.services.push(req.body.services);
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
	res.render('logout', {loggedIn: false, userType: null});
});

//Async function for uploading an immage

//Client user profile page
app.get('/profile', sessionValidation, async(req, res) => {
	//bandaid fix so its easier to test (delete later)
	setUserDatabase(req);

	//upload the info of the user
	let user = await userdb.collection('info').findOne();

	//currently no profile page available for the business side
	if(req.session.userType == 'client'){
		if(user.profilePic != ''){
			user.profilePic = cloudinary.url(user.profilePic);
		}

		let dogs = await userdb.collection('dogs').find({}).toArray();
		for(let i = 0; i < dogs.length; i++){
			let pic = dogs[i].dogPic;
			if(pic != ''){
				dogs[i].dogPic = cloudinary.url(pic);
			}
		}

		res.render('clientProfile', {loggedIn: isValidSession(req), user: user, editting: false, dogs: dogs, userName: req.session.name, userType: req.session.userType});
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
	let dogs = await userdb.collection('dogs').find({}).toArray();
	//currently no profile page available for the business side
	if(req.session.userType == 'client'){
		if(user.profilePic != ''){
			user.profilePic = cloudinary.url(user.profilePic);
		}

		for(let i = 0; i < dogs.length; i++){
			let pic = dogs[i].dogPic;
			if(pic != ''){
				dogs[i].dogPic = cloudinary.url(pic);
			}
		}

		//render client profile page but with editting set up
		res.render('clientProfile', {loggedIn: isValidSession(req), user: user, editting: true, dogs: dogs, userName: req.session.name, userType: req.session.userType});
		return;
	} else {
		res.redirect('/');
	}

})

//Post for editting the profile
app.post('/profile/editting', upload.single('profilePic'), async(req, res) => {

	//grab current image id
	let user = await userdb.collection('info').find({email: req.session.email}).project({profilePic: 1}).toArray();	
	//update database
	if(req.file){
		await deleteUploadedImage(user[0].profilePic);
		req.body.profilePic = await uploadImage(req.file, "clientAccountAvatars");
	} else {
		req.body.profilePic = user[0].profilePic;
	}

	await userdb.collection('info').updateOne({email: req.session.email}, {$set: req.body});
	res.redirect('/profile');

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
	var email = req.session.email;

	// Logic for business accounts and clients (safe coding)
	if (req.session.userType == 'client') {
		await appUserCollection.deleteMany({email: email, userType: 'client'});
	} else if (req.session.userType == 'business') {
		await appUserCollection.deleteMany({email: email, userType: 'business'});
	}
	await userdb.dropDatabase();

	res.redirect('/logout');
});

async function getUserEvents() {
	var userEvents = await userdb.collection('eventSource').find().project({ title: 1, start: 1, end: 1, _id: 0 }).toArray();
	return userEvents;
}

app.get('/calendar', async (req, res) => {
	setUserDatabase(req);
	res.render('calendarBusiness', {loggedIn: isValidSession(req), userType: req.session.userType});
});

app.get('/events', async (req, res) => {
	const events = await getUserEvents();
	res.json(events);
});

app.post('/addEvent', async (req, res) => {
	var date = req.body.calModDate;
	var startDate = date + "T" + req.body.calModStartHH + ":" + req.body.calModStartMM + ":00";
	var endDate = date + "T" + req.body.calModEndHH + ":" + req.body.calModEndMM + ":00";
	var event = {
		title: req.body.calModTitle,
		start: startDate,
		end: endDate
	};

	await userdb.collection('eventSource').insertOne({
		title: event.title,
		start: event.start,
		end: event.end
	});
	res.redirect('/calendar');
});

app.post('/updateEvent', async (req, res) => {
	var date = req.body.calModDate;
	var startNew = date + "T" + req.body.calModStartHH + ":" + req.body.calModStartMM + ":00";
	var endNew = date + "T" + req.body.calModEndHH + ":" + req.body.calModEndMM + ":00";
	var eventOrig = {
		title: req.body.calModTitleOrig,
		start: req.body.calModStartOrig,
		end: req.body.calModEndOrig
	}

	var eventNew = {
		title: req.body.calModTitle,
		start: startNew,
		end: endNew
	}

	await userdb.collection('eventSource').updateOne({
		title: eventOrig.title,
		start: eventOrig.start,
		end: eventOrig.end
	}, {
		$set: {
			title: eventNew.title,
			start: eventNew.start,
			end: eventNew.end
		}
	});
	res.redirect('/calendar');
});

app.post('/removeEvent', async (req, res) => {
	var calTitle = req.body.calModTitleOrig;
	var calStart = req.body.calModStartOrig;
	var calEnd = req.body.calModEndOrig;
	await userdb.collection('eventSource').deleteOne({
		title: calTitle,
		start: calStart,
		end: calEnd
	});
	res.redirect('/calendar');
});

app.get('/clientList', async (req, res) => {
	// console.log(req.session.name);
	clientList = await appUserCollection.find({companyName: null, userType: 'client'}).project({email: 1, firstName: 1, lastName: 1}).toArray();
	console.log(clientList.length);
	res.render('clientList', {clientArray: clientList, loggedIn: isValidSession(req), userType: req.session.userType});
});

app.use(express.static(__dirname + "/public"));

app.get('*', (req, res) => {
	res.status(404);
	res.render('errorMessage', { error: 'Page not found - 404', loggedIn: isValidSession(req), userType: req.session.userType});
})

app.listen(port, () => {
	console.log("Node application listening on port " + port);
});