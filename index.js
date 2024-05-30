require("./utils.js");
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const ObjectId = require('mongodb').ObjectId;

const bcrypt = require('bcrypt');

const cron = require('node-cron');

const {Storage} = require('@google-cloud/storage');
const {Readable} = require('stream');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');

const fs = require('fs');
const path = require('path');

const multer = require("multer");
const stream = require("stream");
const cloudinary = require('cloudinary').v2;

const Swal = require('sweetalert2');
const Queue = require('bull');
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

//For File Encryption
const algorithm = 'aes-256-ctr';
const secretKey = process.env.SECRET_KEY;

if (!secretKey || secretKey.length !== 32) {
    throw new Error("SECRET_KEY is not defined or does not meet the required length (32 characters) in the environment variables");
}
//console.log(secretKey);

//END OF GOOGLE CLOUD STORAGE

const nodemailer = require('nodemailer');
const app = express();
const port = process.env.PORT || 3000;
const Joi = require('joi');
const ejs = require('ejs');
const { content_v2_1 } = require("googleapis");

// 1 hour
const expireTime = 2 * 60 * 60 * 1000;

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

//Creating a MongoClient and using it to connect to a specified database
const MongoClient = require("mongodb").MongoClient;
const appdb = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_appdb}?retryWrites=true`);

// ----- Collections -----
const appUserCollection = appdb.db(mongodb_appdb).collection('users');

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

//Function to check the dates of the scheduled notifications
async function notificationsToAlert(req){
	if(req.session && req.session.userType == 'client'){
		const userdb = appdb.db(req.session.userdb);
		let allNotifications = await userdb.collection('notifications').find({}).toArray();
		
		if(allNotifications.length >= 1){
			let notificationsToAlert = []

			let currDate = new Date();
			for(let i = 0; i < allNotifications.length; i++){
				if(allNotifications[i].date <= currDate){
					if(allNotifications[i].vaccine){
						notificationsToAlert.push({
							dog: allNotifications[i].dog,
							dogId: allNotifications[i].dogId,
							type: allNotifications[i].type,
							vaccine: allNotifications[i].vaccine,
							date:currDate,
							alertType: allNotifications[i].notifType
						});
					}
				}
			}

			if(notificationsToAlert.length >= 1){
				await Promise.all([
					...notificationsToAlert.map(notif =>
					userdb.collection('notifications').deleteOne(
					{ vaccine: notif.vaccine, type: notif.type, dog:notif.dog })
					),
					userdb.collection('alerts').insertMany(notificationsToAlert),
					appUserCollection.updateOne({email: req.session.email}, {$inc: {unreadAlerts: notificationsToAlert.length}})
				]);
			}
		}
	}
}

// Use the updateUnreadAlerts middleware for all routes
//middleWare
async function updateUnreadAlerts(req, res, next) {
	// console.log(req.session);
    if (req.session && req.session.email) {
        try {
			// console.log(req.session.email);
            let alerts = await appUserCollection.find({ email: req.session.email }).project({ unreadAlerts: 1 }).toArray();
            let unreadAlerts = alerts.length > 0 ? alerts[0].unreadAlerts : 0;
            req.session.unreadAlerts = unreadAlerts;
        } catch (error) {
            console.error('Error updating unread alerts:', error);
        }
    }
    next(); // Pass control to the next middleware function
}

app.use(updateUnreadAlerts);

// middleware for unread direct messages
async function updateUnreadMessages(req, res, next) {
	if (isValidSession(req) && req.session.trainerdb) { //if Client with trainer
		try {
			const trainerdb = appdb.db(req.session.trainerdb);
			const unreadMessages = await trainerdb.collection('messages').find({receiver: req.session.email, unread: true}).toArray();
			req.session.unreadMessages = unreadMessages.length;
		} catch (error) {
			console.error("Error updating unread messages:", error);
		}
	} else if (isValidSession(req) && isBusiness(req)) { //if trainer
		try {
			const userdb = appdb.db(req.session.userdb);
			const clients = await userdb.collection('clients').find().project({email:1}).toArray();
			let unreadMessages = 0;
			if (clients.length > 0) {
				for (let i = 0; i < clients.length; i++) {
					setClientDatabase(req, clients[i].email);
					const clientdb = appdb.db(req.session.clientdb);
					const checkMessages = await clientdb.collection('messages').find({unread: true}).toArray();
					unreadMessages += checkMessages.length;
				}
			}
			req.session.unreadMessages = unreadMessages;
		} catch (error) {
			console.error("Error updating unread messages:", error);
		}
	}
	next();
}

app.use(updateUnreadMessages);

// Function that checks if the user is a client
function isClient(req) {
	if (req.session.userType == 'client') {
		return true;
	} else {
		return false;
	}
}

// Function that checks if the user is a business
function isBusiness(req) {
	if (req.session.userType == 'business') {
		return true;
	} else {
		return false;
	}
}

// Function that checks if the session is valid
function isValidSession(req) {
	if (req.session.authenticated) {
		return true;
	} else {
		return false;
	}
}

// Middleware to validate the session. If the session is not valid, it redirects to the homepage.
function sessionValidation(req, res, next) {
	if (isValidSession(req)) {
		next();
	} else {
		res.redirect('/');
	}
}

// Function that checks if the user is an admin
function isAdmin(req) {
	if (req.session.userType == 'admin') {
		return true;
	} else {
		return false;
	}
}

// Middleware that allows users through if they're an administrator, otherwise presenting the unauthorized user with a 403 page
function adminAuthorization(req, res, next) {
	if (!isAdmin(req)) {
		res.status(403);
		res.render('errorMessage', { errorTitle: '403', errorMsg: 'Looks like you\'re in the doghouse! Or... you just don\'t have permission to view this page.', loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
	} else {
		next();
	}
}

// Middleware that allows clients to see pages that people without an account would otherwise not be able to see.
function clientAuthorization(req, res, next) {
	if (!isClient(req)) {
		res.status(403);
		res.render('errorMessage', { errorTitle: '403', errorMsg: 'Looks like you\'re in the doghouse! Or... you just don\'t have permission to view this page.', loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
	} else {
		next();
	}
}

// Middleware to authorize business users to see pages that regular client users or otherwise would not be able to see
function businessAuthorization(req, res, next) {
	if (!isBusiness(req)) {
		res.status(403);
		res.render('errorMessage', { errorTitle: '403', errorMsg: 'Looks like you\'re in the doghouse! Or... you just don\'t have permission to view this page.', loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
	} else {
		next();
	}
}

//Function to call to update the Unread Alerts icon
async function updateUnreadAlertsMidCode(req) {
    if (req.session && req.session.email) {
        try {
            let alerts = await appUserCollection.find({ email: req.session.email }).project({ unreadAlerts: 1 }).toArray();
            let unreadAlerts = alerts.length > 0 ? alerts[0].unreadAlerts : 0;
            req.session.unreadAlerts = unreadAlerts;
        } catch (error) {
            console.error('Error updating unread alerts:', error);
        }
    }
}

// middleware for unread direct messages on it's own
async function updateUnreadMessagesMidCode(req) {
	if (isValidSession(req) && req.session.trainerdb) { //if Client with trainer
		try {
			const trainerdb = appdb.db(req.session.trainerdb);
			const unreadMessages = await trainerdb.collection('messages').find({receiver: req.session.email, unread: true}).toArray();
			req.session.unreadMessages = unreadMessages.length;
		} catch (error) {
			console.error("Error updating unread messages:", error);
		}
	} else if (isValidSession(req) && isBusiness(req)) { //if trainer
		try {
			const userdb = appdb.db(req.session.userdb);
			const clients = await userdb.collection('clients').find().project({email:1}).toArray();
			let unreadMessages = 0;
			if (clients.length > 0) {
				for (let i = 0; i < clients.length; i++) {
					setClientDatabase(req, clients[i].email);
					const clientdb = appdb.db(req.session.clientdb);
					const checkMessages = await clientdb.collection('messages').find({unread: true}).toArray();
					unreadMessages += checkMessages.length;
				}
			}
			req.session.unreadMessages = unreadMessages;
		} catch (error) {
			console.error("Error updating unread messages:", error);
		}
	}
}

// Sets the database for current user
async function setUserDatabase(req) {
    let dbName = '';

    if (!req.session) {
        throw new Error('Session is not initialized');
    }

    if (isClient(req)) {
        const clientEmail = req.session.email.replaceAll(/[\s.]/g, "");
        dbName = `${mongodb_clientdb}-${clientEmail}`;
    } else if (isBusiness(req)) {
		const businessName = req.session.name.replaceAll(/[\s.]/g, "")
        dbName = `${mongodb_businessdb}-${businessName}`;
    } else {
        throw new Error('User type not recognized');
    }

    req.session.userdb = dbName;
	// console.log('userdb: ' + req.session.userdb);
}

// Allows access to the trainer's database when tied to a client
async function setTrainerDatabase(req) {
	if (!isClient(req)) {
		return;
	} else {
		const trainer = await appUserCollection.find({ email: req.session.email}).project({companyName: 1, _id: 1}).toArray();
		// Checking for if the client currently has a hired trainer.
		if (trainer[0].companyName == null || trainer[0].companyName == '' || trainer[0].companyName == undefined) {
			return;
		} else {
			const trainerName = mongodb_businessdb + '-' + trainer[0].companyName.replaceAll(/[\s.]/g, "");
			req.session.trainerdb = trainerName;
			// console.log('trainerdb: ' + req.session.trainerdb);
		}
	}
}

function setClientDatabase(req, client) {
	const clientEmail = client.replaceAll(/[\s.]/g, "");
	const dbName = mongodb_clientdb + '-' + clientEmail;
	req.session.clientdb = dbName;
	// console.log('clientdb: ' + req.session.clientdb);
}

async function getdb(dbName) {
	const uri = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${dbName}?retryWrites=true`;
	const type = new MongoClient(uri);
	await type.connect();
	return type.db(dbName);
}

// Function to encrypt the PDF file.
//The buffer refers to the actual PDF file that you want to encrypt.
function encrypt(buffer) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, 'utf8'), iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    
    //Return the IV and the encrypted data as hex strings
    return {
        iv: iv.toString('hex'),
        content: encrypted.toString('hex')
    };
}

// Function to decrypt the PDF file
function decrypt(encrypted) {
    const iv = Buffer.from(encrypted.iv, 'hex');
    const encryptedText = Buffer.from(encrypted.content, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, 'utf8'), iv);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted;
}

// Function to download and decrypt file from Google Cloud Storage
async function downloadAndDecryptFile(filePath) {
    const bucket = googleStorage.bucket(bucketName);
    const file = bucket.file(filePath);

    let encryptedBuffer = Buffer.alloc(0);

    await pipeline(
        file.createReadStream(),
        new stream.Transform({
            transform(chunk, encoding, callback) {
                encryptedBuffer = Buffer.concat([encryptedBuffer, chunk]);
                callback();
            }
        })
    );

    // Extract the IV and encrypted content from the buffer
    const iv = encryptedBuffer.slice(0, 16);  // First 16 bytes are the IV
    const encryptedContent = encryptedBuffer.slice(16);

    // Decrypt the file content
    const decipher = crypto.createDecipheriv('aes-256-ctr', Buffer.from(secretKey, 'utf8'), iv);
    const decryptedBuffer = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);

    return decryptedBuffer;
}

//Upload files to Google Cloud
async function uploadFileToGoogleCloud(fileBuffer, fileName) {
    const encryptedFile = encrypt(fileBuffer); // Encrypt the file first
    const bucket = googleStorage.bucket(bucketName);
    const file = bucket.file(fileName);
    const ivBuffer = Buffer.from(encryptedFile.iv, 'hex');
    const encryptedBuffer = Buffer.from(encryptedFile.content, 'hex');

    // Prefix the IV to the encrypted content
    const finalBuffer = Buffer.concat([ivBuffer, encryptedBuffer]);

    return new Promise((resolve, reject) => {
        const encryptedStream = Readable.from(finalBuffer);
        encryptedStream.pipe(file.createWriteStream())
            .on('error', reject)
            .on('finish', () => {
                resolve(file.publicUrl());
            });
    });
}

// Function to OVERWRITE a file to Google Cloud
async function overwriteOrUploadFile(buffer, filePath) {
    const bucket = googleStorage.bucket(bucketName);
    const file = bucket.file(filePath);
    
    //Encrypt the file buffer
    const encryptedFile = encrypt(buffer);
    
    const encryptedStream = Readable.from(Buffer.from(encryptedFile.content, 'hex'));

    return new Promise((resolve, reject) => {
        encryptedStream.pipe(file.createWriteStream({
            metadata: {
                contentType: 'application/pdf',
            },
            resumable: false
        }))
        .on('error', reject)
        .on('finish', () => {
            resolve(file.publicUrl());
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

// Passes a variable called 'currentUrl' to whatever page we're on.
// It's now middleware to also set trainer information.
app.use(async (req, res, next) => {
    res.locals.currentUrl = req.originalUrl; // I don't think we're doing any internal routing, but for safety, I'm using originalUrl instead of url to prevent issues in the future.
    if (req.session.userType === 'client') {
        let user = await appUserCollection.findOne({ email: req.session.email });
        
        // If the user exists and also has a companyName, find the business user with the respective name
        if (user && user.companyName) {
			// console.log(user.companyName.replaceAll(' ', '.'));
            let trainer = await appUserCollection.findOne({ companyName: user.companyName, userType: 'business' });
            // If the trainer is found, set trainerAssigned to true
            res.locals.trainerAssigned = true;
            res.locals.trainer = {
                name: trainer.companyName || '',
                email: trainer.email || ''
            };
        } else {
            // If there's no trainer, set trainerAssigned to false
            res.locals.trainerAssigned = false;
        }
    }
    next();
});


// TODO: Add access to pages and create a check for the user type and authorization
// status to determine what footer and navbar to display

app.get('/', (req, res) => {
	res.render('index', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
});

app.get('/about',  (req, res) => {
	res.render('about', {loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: 0});
});

app.get('/test', (req, res) => {
	res.render('test', {loggedIn: true, name: 'Test User', userType: 'business', unreadAlerts: 0, unreadMessages: 0});
});

app.get('/FAQ', (req, res) => {
	res.render('FAQ', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: 0});
});

app.get('/clientResources', (req, res) => {
	res.render('clientResources', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: 0});
});

app.get('/login/:loginType', (req, res) => {
	// if(req.params.loginType.replace('?', '') == 'clientLogin' || req.params.loginType.replace('?', '') == 'businessLogin'){
		res.render(req.params.loginType, {loggedIn: isValidSession(req), loginType: req.params.loginType, unreadAlerts: 0, unreadMessages: 0});
	// }

	// res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: 0, unreadMessages: 0});
})

//Submitting info collected from sign up forms
app.post('/submitSignup/:type', async (req, res) => {
	let type = req.params.type;

	//Submits info for client side forms
	if (type == "client") {

		// Validate the email
		emails = await appUserCollection.find().project({email: 1}).toArray();

		for (let i = 0; i < emails.length; i++) {
			if (emails[i].email === req.body.email) {
				res.render('errorMessage', { 
					errorTitle: 'Email Already In Use', 
					errorMsg: 'The email address you entered is already in use. Consider sending a password reset from the signup page.', 
					loggedIn: isValidSession(req), 
					userType: req.session.userType, 
					unreadAlerts: req.session.unreadAlerts, 
					unreadMessages: req.session.unreadMessages
				});
				return;
			}
		}

		//Validation schema for inputted values
		var schema = Joi.object(
			{
				firstName: Joi.string().pattern(/^[a-zA-Z\s]*$/).max(20).required(),
				lastName: Joi.string().pattern(/^[a-zA-Z\s]*$/).max(20).required(),
				email: Joi.string().email().required(),
				phone: Joi.string().pattern(/^[0-9\s]*$/).length(10).required(),
				address: Joi.string().pattern(/^[0-9a-zA-Z',\-&*@\s]*$/).required(),
				password: Joi.string().max(20).min(2).required()
			}
		);

		//store user inputs from req.body
		var user = {
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			email: req.body.email,
			phone: req.body.phone.replace(/ /g,''),
			address: req.body.address,
			password: req.body.password
		};

		//validate inputs against schema
		var validationRes = schema.validate(user);

		//Deal with errors from validation
		if (validationRes.error != null) {
			console.log(validationRes.error);
			res.render('errorMessage', {loggedIn: isValidSession(req), userType: req.session.userType, errorTitle: 'Incomplete or Invalid' , errorMsg: 'Ruh Roh! That information is invalid! Please try again.', unreadAlerts: req.session.unreadAlerts, unreadMessages: 0});
			return;
		}

		//Hash entered password for storing
		let hashPass = await bcrypt.hash(user.password, saltRounds);

		//Store new user info in the appdb
		await appUserCollection.insertOne({
			email: user.email,
			companyName: null,
			firstName: user.firstName,
			lastName: user.lastName,
			phone: user.phone,
			password: hashPass,
			userType: 'client',
			unreadAlerts: 0,
            emailNotifications: true //DELETE THIS MAYBE
		});

		//Update the session for the now logged in user
		req.session.authenticated = true;
		req.session.email = user.email;
		req.session.name = user.firstName + ' ' + user.lastName;
		req.session.userType = 'client';
		req.session.cookie.maxAge = expireTime;
		req.session.unreadAlerts = 0;

		await setUserDatabase(req);
		const userdb = appdb.db(req.session.userdb);

		//Store client information in client collection
		await userdb.collection('info').insertOne({
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
			phone: user.phone,
			address: user.address
		});

	//Submits info for business side forms
	} else if (type == "business") {

		// Validate the email
		emails = await appUserCollection.find().project({email: 1}).toArray();

		for (let i = 0; i < emails.length; i++) {
			if (emails[i].email === req.body.businessEmail) {
				res.render('errorMessage', { 
					errorTitle: 'Email Already In Use', 
					errorMsg: 'The email address you entered is already in use. Consider sending a password reset from the signup page.', 
					loggedIn: isValidSession(req), 
					userType: req.session.userType, 
					unreadAlerts: req.session.unreadAlerts, 
					unreadMessages: req.session.unreadMessages
				});
				return;
			}
		}

		//Validation schema for user inputs
		var schema = Joi.object(
			{
				companyName: Joi.string().pattern(/^[a-zA-Z0-9\s\-']*$/).max(40).required(),
				companyEmail: Joi.string().email().required(),
				companyPhone: Joi.string().pattern(/^[0-9\s]*$/).length(10).required(),
				firstName: Joi.string().pattern(/^[a-zA-Z\s]*$/).max(20).required(),
				lastName: Joi.string().pattern(/^[a-zA-Z\s]*$/).max(20).required(),
				companyWebsite: Joi.string().pattern(/^(https?:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/).allow(null, ''),
				password: Joi.string().max(20).min(2).required()
			}
		);

		//Stores all user inputs that a user types in from req.body
		var user = {
			companyName: req.body.companyName,
			companyEmail: req.body.businessEmail,
			comapnyPhone: req.body.businessPhone.replace(/ /g,''),
			firstName: req.body.firstName,
			lastName: req.body.lastName,
			companyWebsite: req.body.companyWebsite,
			password: req.body.password
		};

		//Validates user inputs against schema
		var validationRes = schema.validate(user);

		//Deals with errors from validation
		if (validationRes.error != null) {
			console.log(validationRes.error);
			res.render('errorMessage', {loggedIn: isValidSession(req), userType: req.session.userType, errorTitle: 'Incomplete or Invalid' , errorMsg: 'Ruh Roh! That information is invalid! Please try again.', unreadAlerts: req.session.unreadAlerts, unreadMessages: 0});
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
			email: user.companyEmail,
			companyName: user.companyName,
			firstName: user.firstName,
			lastName: user.lastName,
			phone: user.companyPhone,
			password: user.password,
			userType: 'business',
			unreadAlerts: 0
		});

		//Update the session for the now logged in user
		req.session.authenticated = true;
		req.session.email = user.companyEmail;
		req.session.name = user.companyName;
		req.session.userType = 'business';
		req.session.cookie.maxAge = expireTime;
		req.session.unreadAlerts = 0;

		await setUserDatabase(req);
		const userdb = appdb.db(req.session.userdb);

		//Store business information in client collection
		await userdb.collection('info').insertOne({
			companyName: user.companyName,
			email: user.companyEmail,
			phone: user.companyPhone,
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

	//Redirect to home
	res.redirect('/');
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
		res.redirect("/");
		return;
	}

	// find a result for the client accounts first
	var result = await appUserCollection.find({ email: email }).project({ email: 1, companyName: 1, firstName: 1, lastName: 1, password: 1, userType: 1, _id: 1, unreadAlerts: 1}).toArray();

	// // if there are no clients, search through the admin accounts
	if (result.length == 0) {
		res.render('errorMessage', {loggedIn: isValidSession(req), userType: req.session.userType, errorTitle: 'No User Found' , errorMsg: 'Guard Dog on Duty! Trespassers Beware!', unreadAlerts: req.session.unreadAlerts, unreadMessages: 0});
		return;
	}

	// check the passwords to see if they match. If they do, create a session for the user and send them to the
	if (await bcrypt.compare(password, result[0].password)) {
		req.session.authenticated = true;
		req.session.email = email;
		req.session.userType = result[0].userType;
		req.session.unreadAlerts = result[0].unreadAlerts;

		// Set session name to first+last if client, companyname if business
		if (req.session.userType == 'client') {
			req.session.name = result[0].firstName + ' ' + result[0].lastName;
			await setTrainerDatabase(req);
		} else if (req.session.userType == 'business') {
			req.session.name = result[0].companyName;
		}
		req.session.cookie.maxAge = expireTime;

		await setUserDatabase(req);
		
		//Run any needed updates to the database for notifications
		await notificationsToAlert(req);
		cron.schedule('0 0 * * *', () => {
			notificationsToAlert(req);
		});

		res.redirect('/loggedIn'); // redirect to home page
		return;
	} else {

		// if the password is incorrect, say so
		res.render('errorMessage', {loggedIn: isValidSession(req), userType: req.session.userType, errorTitle: 'Password is Incorrect' , errorMsg: 'Guard Dog on Duty! No entry without the right password!', unreadAlerts: req.session.unreadAlerts, unreadMessages: 0});
	}
});

app.get('/loggedIn', (req, res) => {
	res.redirect('/');
});

// forget password (link it after) -> enter email -> get email (in progress) -> make a password -> 
// This is the reset password landing page where the user can enter their email for a reset

// This function is solely for sending password reset emails. It will need an ejs file for the email templating later
function sendResetMail(emailAddress, resetToken) {
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
				res.render('errorMessge', { errorTitle: 'Email couldn\'t be sent', errorMsg: 'Not even this nose can find something that doesn\'t exist!', loggedIn: false, userType: null , unreadAlerts: 0, unreadMessages: 0})
			}
		});
	});
}

// This function sets up the reminder emails to be sent. Sets up sending an email an hour before, and 24 hours before the appointment.
async function sendReminderEmails() {
	const userdb = appdb.db(req.session.userdb);
    const now = new Date();

    const events = await userdb.collection('eventSource').find({
        $or: [
            { start: { $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), $gt: now.toISOString() } },
            { start: { $lte: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), $gt: now.toISOString() } }
        ]
    }).toArray();

    for (const event of events) {
        const user = await appUserCollection.findOne({ email: event.userEmail });
        const eventTime = new Date(event.start);
    }
}

// This function sends other types of emails. Right now I'm adding it so that you can send appointment information. (but you can parse anything you want, really.)
const sendEmail = async (to, subject, eventTitle, eventDate, eventStartTime, eventEndTime, db) => {
    try {
        // Creates and renders an email template with the provided event details
        const str = await ejs.renderFile('./views/reminderEmail.ejs', { 
            eventTitle: eventTitle,
            eventDate: eventDate,
            eventStartTime: eventStartTime,
            eventEndTime: eventEndTime
        });

        // Initializes an empty array to hold all recipients
        var recipients = [];
        
        // This goes through the list of email addresses to check if they want to receive email notifications, and adds them to the array
        for (let email of to) {
            const user = await appUserCollection.find({email: email}).toArray();
            if (user) {
                const emailNotifications = user[0].emailNotifications;
                // console.log(`User: ${email}, emailNotifications: ${emailNotifications}`);
                if (emailNotifications === true || emailNotifications === undefined) {
                    recipients.push(email);
                }
            } else {
                console.log(`User not found: ${email}`);
            }
        }
        
        // If there are recipients in the array, send the email(s)
        if (recipients.length > 0) {
            const mailOptions = {
                from: autoreply_email,
                to: recipients,
                subject: subject,
                html: str
            };
            
            // Send the email
            const info = await transporter.sendMail(mailOptions);
        } else {
            console.log('No recipients with email notifications enabled.');
        }
    } catch (error) {
        console.error('Error sending email:', error);
    }
};


// This routing is the main page for forgetting your password.
app.get('/forgotPassword', (req, res) => {

	// If the email is invalid, the query will have an error message. Otherwise, we want it blank so it doesn't always show
	const errorMessage = req.query.errorMessage || '';
	res.render('forgotPassword', { errorMessage: errorMessage, loggedIn: false, userType: null, unreadAlerts: 0, unreadMessages: 0});
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
		sendResetMail(email, token);

		// Redirect to an email sent page
		res.redirect('/emailSent');
		return;
	}

	// This is a custom error message for if the email is invalid
	// This does not have anything to do with the errorMessage.ejs file, this is simply for query
	const error = 'Invalid Email Address';

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
		res.render('errorMessage', { errorTitle: 'Invalid or Expired Token', errorMsg: 'That\'s one stale dog bone! Please try again.', loggedIn: false, userType: null, unreadAlerts: 0, unreadMessages: 0})
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
	res.render('resetPasswordForm', { token: token.token, loggedIn: false, userType: null , unreadAlerts: 0, unreadMessages: 0});
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
	res.render('passwordChangedSuccessfully', {loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: 0});
});

app.get('/emailSent', (req, res) => {
	res.render('checkInbox', {loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: 0});
});

app.get('/logout', (req, res) => {
	req.session.destroy();
	// res.render('logout', {loggedIn: false, userType: null});
	res.redirect('/');
});

//Async function for uploading an immage

//Client user profile page
app.get('/profile', sessionValidation, async(req, res) => {

	const userdb = appdb.db(req.session.userdb);

	//upload the info of the user
	let user = await userdb.collection('info').findOne();

	//Client profile page
	if(req.session.userType == 'client'){
		//Collect profile pic link if there is one
		if(user.profilePic != ''){
			user.profilePic = cloudinary.url(user.profilePic);
		}

		//Gather dogs and their images if they have one
		let [dogs, outstandingBalance] = await Promise.all([
			userdb.collection('dogs').find({}).toArray(),
			userdb.collection('outstandingBalance').find({}).toArray()
		]);
		for(let i = 0; i < dogs.length; i++){
			let pic = dogs[i].dogPic;
			if(pic != '' && pic != null){
				dogs[i].dogPic = cloudinary.url(pic);
			}
		}

		//Unhash client address


		//Render client profile page
		res.render('clientProfile', {loggedIn: isValidSession(req), user: user, dogs: dogs, records: outstandingBalance, userName: req.session.name, userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
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
			res.render('businessProfile', {loggedIn: isValidSession(req), business: user, trainer: trainer, programs: programs, businessTab: '', trainerTab: 'checked', programsTab: '', userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
		} else if(req.query.tab == 'program'){
			res.render('businessProfile', {loggedIn: isValidSession(req), business: user, trainer: trainer, programs: programs, businessTab: '', trainerTab: '', programsTab: 'checked', userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
		} else {
			res.render('businessProfile', {loggedIn: isValidSession(req), business: user, trainer: trainer, programs: programs, businessTab: 'checked', trainerTab: '', programsTab: '', userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
		}
	}
});

app.get('/clientTrainerHome', sessionValidation, clientAuthorization, async(req, res) => {
	if(req.session.trainerdb){
		const trainerdb = appdb.db(req.session.trainerdb);
		let business = await trainerdb.collection('info').find({}).toArray();

		if(business[0].logo != '' && business[0].logo != null){
			business[0].logo = cloudinary.url(business[0].logo);
		}
		res.json(business[0]);

	} else {
		res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType,  unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
		return;
	}
});

app.get('/clientDogsHome', sessionValidation, clientAuthorization, async(req, res) => {
	const userdb = appdb.db(req.session.userdb);
	let dogs = await userdb.collection('dogs').find({}).toArray();

	for(let i = 0; i < dogs.length; i++){
		if(dogs[i].dogPic && dogs[i].dogPic != ''){
			dogs[i].dogPic = cloudinary.url(dogs[i].dogPic);
		}
	}

	res.json({dogs: dogs});
});

//Profile Editting (both client and business)
app.post('/profile/edit/:editType', upload.array('accountUpload', 2), async(req, res) => {
    const userdb = appdb.db(req.session.userdb);

    // Edit client profile
    if (req.params.editType === 'clientProfile') {
        // Grab current image id
        let user = await userdb.collection('info').find({ email: req.session.email }).project({ profilePic: 1 }).toArray();

        // Image id is updated with a newly uploaded image or kept the same
        if (req.files.length !== 0) {
            await deleteUploadedImage(user[0].profilePic);
            req.body.profilePic = await uploadImage(req.files[0], "clientAccountAvatars");
        } else {
            req.body.profilePic = user[0].profilePic;
        }

        // Handle email notifications checkbox value
        req.body.emailNotifications = req.body.emailNotifications === 'on';

        // Update the database
        await appUserCollection.updateOne({ email: req.session.email }, { $set: { 
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            phone: req.body.phone,
            profilePic: req.body.profilePic,
            emailNotifications: req.body.emailNotifications
        }});

        // Return to profile
        res.redirect('/profile');
    } else if (req.params.editType == 'businessDetails') {
        // Grab current logo id
        let business = await userdb.collection('info').find({ companyName: req.session.name }).toArray();

		//Logo id is updated with a newly upload logo or kept the same
		if(req.files.length != 0){
			if(req.files.length < 2){

				let filename = req.files[0].mimetype;
				filename = filename.split('/');
				let fileType = filename[0];

				if(fileType == 'image'){
					await deleteUploadedImage(business[0].logo);
					req.body.logo = await uploadImage(req.files[0], "businessLogos");
				} else {
					let fullFileName = `${req.session.name}_contract.pdf`;
					let filePath = `pdfs/${fullFileName}`;
					let fileUrl = await uploadFileToGoogleCloud(req.files[0].buffer, filePath);
					req.body.contract = filePath;
				}
			} else if (req.files.length == 2){
				for(let i = 0; i < req.files.length; i++){
					let filename = req.files[i].mimetype;
					filename = filename.split('/');
					let fileType = filename[i];

					if(fileType == 'image'){
						await deleteUploadedImage(business[0].logo);
						req.body.logo = await uploadImage(req.files[i], "businessLogos");
					} else {
						let fullFileName = `${req.session.name}_contract.pdf`; // Format the file name
						let filePath = `pdfs/${fullFileName}`;
						let fileUrl = await uploadFileToGoogleCloud(req.files[i].buffer, filePath);
						req.body.contract = filePath;
					}
				}
			} else {
				req.body.logo = business[0].logo;
			}
		}

		

        // Update database
        await userdb.collection('info').updateOne({ companyName: req.session.name }, { $set: req.body });

        // Return to profile, business details tab
        res.redirect('/profile?tab=business');

    // Edit business profile -> trainer profile
    } else if (req.params.editType == 'trainer') {
        // Grab current profile pic id
        let trainer = await userdb.collection('trainer').find({ companyName: req.session.name }).project({ trainerPic: 1 }).toArray();

        // Profile pic id is updated with a newly uploaded Profile pic or kept the same
        if (req.files.length != 0) {
            await deleteUploadedImage(trainer[0].trainerPic);
            req.body.trainerPic = await uploadImage(req.files[0], "trainerAvatars");
        } else {
            req.body.trainerPic = trainer[0].trainerPic;
        }

        // Update database
        await userdb.collection('trainer').updateOne({ companyName: req.session.name }, { $set: req.body });

        // Return to profile, trainer profile tab
        res.redirect('/profile?tab=trainer');

	//Edit business profile -> Programs (can only add a program from profile page)
	} else if(req.params.editType == 'addProgram'){

		//Set up program from submitted information 
		let program = {
			name: req.body.name,
			pricing: {
				priceType: req.body.priceType,
				price: parseInt(req.body.price).toFixed(2)
			},
			discount: req.body.discounts,
			hours: req.body.hours,
			sessions: req.body.sessions,
			description: req.body.description,
			service: req.body.service
		}

		//Insert program into database
		await userdb.collection('programs').insertOne(program);

		//Return to profile, programs tab
		res.redirect('/profile?tab=program');
	}

});

//Display specific program
app.get('/program/:programId', sessionValidation, businessAuthorization, async(req, res) => {
	const userdb = appdb.db(req.session.userdb);

	//Check programId is a hexstring
	if(req.params.programId.length != 24){
		res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType,  unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
		return;
	}

	//Use program id to access program
	let programId =  ObjectId.createFromHexString(req.params.programId);
	let [program, business] = await Promise.all([
		userdb.collection('programs').find({_id: programId}).toArray(),
		userdb.collection('info').find({}).project({services: 1}).toArray()
	]);


	//Render program page with the specific program details if the program exists
	if(program.length > 0){
		res.render('programDetails', {loggedIn: isValidSession(req), userType: req.session.userType, program: program[0], services: business[0].services, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
	} else {
		res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType,  unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
	}
	
});

//Edit specific program
app.post('/program/:programId/edit', async(req, res) => {
	const userdb = appdb.db(req.session.userdb);

	//Set up program with submitted info
	let = program = {
		name: req.body.name,
		pricing: {
			priceType: req.body.priceType,
			price: req.body.price
		},
		discount: req.body.discounts,
		hours: req.body.hours,
		sessions: req.body.sessions,
		description: req.body.description,
		service: req.body.service
	}

	//Use program id to update program with new details
	let programId =  ObjectId.createFromHexString(req.params.programId);
	await userdb.collection('programs').updateOne({_id: programId}, {$set: program});

	//Return to specific program page
	res.redirect('/program/' + req.params.programId);
});

//Form for adding a new dog
app.get('/addDog', sessionValidation, clientAuthorization, (req, res) => {
	res.render('addDog', {loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
});

//Adds the dog to the database
app.post('/addingDog', upload.array('dogUpload', 6), async (req, res) => {
    const userdb = appdb.db(req.session.userdb);
  
	var schema = Joi.object(
		{
			dogName: Joi.string().pattern(/^[a-zA-Z\s\'\-]*$/).max(20),
			dogBreed: Joi.string().pattern(/^[a-zA-Z\s\'\-]*$/).max(40),
			specialAlerts: Joi.string().pattern(/^[A-Za-z0-9 _.,!"'()#;:\s]*$/).allow(null, '')
		}
	);

    if (!req.body.specialAlerts) {
        req.body.specialAlerts = '';
    }

    let validationRes = schema.validate({ dogName: req.body.dogName, dogBreed: req.body.dogBreed, specialAlerts: req.body.specialAlerts });
    
    // Deals with errors from validation
    if (validationRes.error != null) {
		res.render('errorMessage', {
            loggedIn: isValidSession(req), 
            userType: req.session.userType, 
            errorTitle: 'Incomplete or Invalid' ,
            errorMsg: 'Ruh Roh! That information is invalid! Please try again.',
            unreadAlerts: req.session.unreadAlerts,
            unreadMessages: req.session.unreadMessages
        });
        return;
    }

    // create a dog document
    let dog = {
        dogName: req.body.dogName
    };

	// Creates documents in the dog document for each vaccine
    let allVaccines = ['rabies', 'leptospia', 'bordatella', 'bronchiseptica', 'DA2PP'];
    allVaccines.forEach((vaccine) => {
        eval('dog.' + vaccine + '= {}');
    });

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
            if (fileType != 'image') {
                v++;
            }

            // Get the last name of the client
            let lastName = req.session.name.split(' ')[1];
            
            //Uploads the file to Google Cloud Storage
            if (fileType === 'application') {
                let fullFileName = `${lastName}_${dogName}_${vaccineType}.pdf`;
                let filePath = `pdfs/${fullFileName}`;
                let fileUrl = await uploadFileToGoogleCloud(req.files[i].buffer, filePath);
                req.body[vaccineType + 'Proof'] =  filePath;
            }
        }
    } else {
        dog.dogPic = '';
    }

    // stores the neutered status
    if (req.body.neuteredStatus == 'neutered') {
        dog.neuteredStatus = req.body.neuteredStatus;
    } else {
        dog.neuteredStatus = 'not neutered';
    }

    // Stores sex, birthday, weight, specialAlerts of the dog
	dog.breed = req.body.breed;
    dog.sex = req.body.sex;
    dog.birthday = req.body.birthday;
    dog.weight = req.body.weight;
	dog.breed = req.body.breed;
    dog.specialAlerts = req.body.specialAlerts;


	let vaccineNotifs = [];

    // If dog has more than one vaccine, add the expiration date and pdf of the proof of vaccination to the specific vaccine document
    if (Array.isArray(req.body.vaccineCheck)) {
        req.body.vaccineCheck.forEach((vaccine) => {
			let expirationDate = new Date(req.body[vaccine + 'Date']);
			let weekBeforeDate = new Date(expirationDate);
			weekBeforeDate = new Date(weekBeforeDate.setDate(expirationDate.getDate() - 7))
            dog[vaccine] = {
                expirationDate: req.body[vaccine + 'Date'],
                vaccineRecord: req.body[vaccine + 'Proof']
            };

			vaccineNotifs.push({
				dog: req.body.dogName,
				vaccine: vaccine,
				type: 'Expired',
				date: expirationDate,
				notifType: 'vaccineUpdate'
			});

			if(expirationDate > new Date()){
				vaccineNotifs.push({
					dog: req.body.dogName,
					vaccine: vaccine,
					type: 'One week warning',
					date: weekBeforeDate,
					notifType: 'vaccineUpdate'
				});
			}
        });
    } else if (req.body.vaccineCheck) {
		let expirationDate = new Date(req.body[req.body.vaccineCheck + 'Date']);
		let weekBeforeDate = new Date(expirationDate);
		weekBeforeDate = new Date(weekBeforeDate.setDate(expirationDate.getDate() - 7))

        dog[req.body.vaccineCheck] = {
            expirationDate: req.body[req.body.vaccineCheck + 'Date'],
            vaccineRecord: req.body[req.body.vaccineCheck + 'Proof']
        };

		vaccineNotifs.push({
			dog: req.body.dogName,
			vaccine: req.body.vaccineCheck,
			type: 'Expired',
			date: expirationDate,
			notifType: 'vaccineUpdate'
		});

		if(expirationDate > new Date()){
			vaccineNotifs.push({
				dog: req.body.dogName,
				vaccine: req.body.vaccineCheck,
				type: 'One week warning',
				date: weekBeforeDate,
				notifType: 'vaccineUpdate'
			});
		}	
    }

    // Insert the dog into the database and return to profile
	let dogId = await userdb.collection('dogs').insertOne(dog);
	for(let i = 0; i < vaccineNotifs.length; i++){
		vaccineNotifs[i].dogId = dogId.insertedId;
	}
	if(vaccineNotifs.length >= 1){
		await userdb.collection('notifications').insertMany(vaccineNotifs);
		notificationsToAlert(req);
	}
	
    res.redirect('/profile');
});

// Configure multer to handle fields with specific names
const uploadFields = upload.fields([
  { name: 'rabiesUpload', maxCount: 1 },
  { name: 'leptospiaUpload', maxCount: 1 },
  { name: 'bordatellaUpload', maxCount: 1 },
  { name: 'bronchisepticaUpload', maxCount: 1 },
  { name: 'DA2PPUpload', maxCount: 1 }
]);

// Route to handle updating vaccination records
app.post('/dog/:dogId/editVaccines', uploadFields, async (req, res) => {
  const userdb = appdb.db(req.session.userdb);
  const dogId = req.params.dogId;

  let dog = await userdb.collection('dogs').findOne({ _id: new ObjectId(dogId) });

  if (!dog) {
    return res.status(404).send('Dog not found');
  }

  const vaccineTypes = ['rabies', 'leptospia', 'bordatella', 'bronchiseptica', 'DA2PP'];
  let vaccineNotifs = [];
  
  for (let vaccineType of vaccineTypes) {
    const file = req.files[`${vaccineType}Upload`] ? req.files[`${vaccineType}Upload`][0] : null;
    if (file) {
      let fileType = file.mimetype.split('/')[0];
      let dogName = dog.dogName;
      let lastName = req.session.name.split(' ')[1];

      if (fileType === 'application') {
        let fullFileName = `${lastName}_${dogName}_${vaccineType}.pdf`;
        let filePath = `pdfs/${fullFileName}`;
        let fileUrl = await overwriteOrUploadFile(file.buffer, filePath);

        // Initialize vaccine type if it doesn't exist
        if (!dog[vaccineType]) {
          dog[vaccineType] = {};
        }

        // Add vaccine record URL
        dog[vaccineType].vaccineRecord = filePath;

        // Add or update expiration date
        if (req.body[`${vaccineType}Date`]) {
			let expirationDate = new Date(req.body[`${vaccineType}Date`]);
			let weekBeforeDate = new Date(expirationDate);
			weekBeforeDate = new Date(weekBeforeDate.setDate(expirationDate.getDate() - 7));
          	dog[vaccineType].expirationDate = req.body[`${vaccineType}Date`];

			vaccineNotifs.push({
				dog: dogName,
				vaccine: vaccineType,
				type: 'Expired',
				date: expirationDate,
				notifType: 'vaccineUpdate',
				dogId: new ObjectId(dogId)
			});
	
			if(expirationDate > new Date()){
				vaccineNotifs.push({
					dog: dogName,
					vaccine: vaccineType,
					type: 'One week warning',
					date: weekBeforeDate,
					notifType: 'vaccineUpdate',
					dogId: new ObjectId(dogId)
				});
			}
        }
      }
    }
  }
 
  await Promise.all([
	...vaccineNotifs.map(notif =>
	  userdb.collection('notifications').deleteOne(
		{ vaccine: notif.vaccine, type: notif.type, dogId: notif.dogId})
	),
	userdb.collection('dogs').updateOne(
	  { _id: new ObjectId(dogId) },
	  { $set: dog }
	),
	userdb.collection('notifications').insertMany(vaccineNotifs)
  ]);

  notificationsToAlert(req);
  
  res.redirect('/profile');
});

//Show specific dog
app.get('/dog/:dogId', sessionValidation, async(req, res) => {

	if(req.session.userType === 'business') {
		res.redirect('/dogView');
	}

	const userdb = appdb.db(req.session.userdb);
	console.log(req.params.dogId);
	//Use the dog document id to find the specific dog
	let dogId =  ObjectId.createFromHexString(req.params.dogId);
	let dogRecord = await userdb.collection('dogs').find({_id: dogId}).toArray();	

	//If there is a dog pic attached to this dog, create a link to it
	if(dogRecord[0].dogPic != '') {
		dogRecord[0].dogPic = cloudinary.url(dogRecord[0].dogPic);
	}

	//Render the dog's profile
	res.render('dogProfile', {loggedIn: isValidSession(req), userType: req.session.userType, dog: dogRecord[0], unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
});

//Edit specific dog
app.post('/dog/:dogId/edit', upload.single('dogUpload'), async(req, res) => {
	const userdb = appdb.db(req.session.userdb);

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
app.post('/dog/:dogId/delete', upload.single('dogUpload'), async(req, res) => {
	const userdb = appdb.db(req.session.userdb);

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

app.get('/accountDeletion', sessionValidation, (req, res) => {
	res.render('accountDeletion', {loggedIn: isValidSession(req), name: req.session.name , userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
});

app.post('/deleteAccount', async (req, res) => {
	const userdb = appdb.db(req.session.userdb);
	// Store the email
	let email = req.session.email;

	// Logic for business accounts and clients (safe coding)
	if (req.session.userType == 'client') {
		if (req.session.trainerdb) {
			const trainerdb = appdb.db(req.session.trainerdb);
			await trainerdb.collection('clients').deleteOne({email: email});
		}
		await appUserCollection.deleteMany({email: email, userType: 'client'});
	} else if (req.session.userType == 'business') {
		let companyName = req.session.name;
		await appUserCollection.updateMany({companyName: companyName}, {set:{companyName: null}});
		await appUserCollection.deleteMany({email: email, userType: 'business'});
	}
	await userdb.dropDatabase();

	res.redirect('/logout');
});

app.get('/findTrainer',sessionValidation, clientAuthorization, async(req, res) => {
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
		let db = mongodb_businessdb + '-' + name.replaceAll(/\s/g, "");
		let userdbAccess = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${db}?retryWrites=true`);
		let tempBusiness = userdbAccess.db(db);

		//Query for the info and trainer
		let info = await tempBusiness.collection('info').find({companyName: name}).toArray();
		let trainer = await tempBusiness.collection('trainer').find({companyName: name}).toArray();

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
		info[0].searchString = info[0].searchString.replaceAll(' ','').toLowerCase();

		//Add the information to each array
		businessDetails.push(info[0]);
		businessTrainers.push(trainer[0]);
	}

	res.render('viewTrainers', {loggedIn: isValidSession(req), userType: req.session.userType, businesses: businessDetails, trainers: businessTrainers, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
});

//Temporary code from calendar testing; changed address to just /trainer
app.get('/trainer', async (req, res) => {
	const trainers = await appUserCollection.find({ userType: 'business' }).project({ _id: 1, companyName: 1 }).toArray();
	res.render('findTrainer', {loggedIn: isValidSession(req), userType: req.session.userType, trainers: trainers, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
});

//View indivdual business
app.get('/viewBusiness/:company', sessionValidation, clientAuthorization, async(req, res) => {
	//Connect to the specific business' database
	let db = mongodb_businessdb + '-' + req.params.company.replaceAll(/\s/g, "");
	let userdbAccess = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${db}?retryWrites=true`);
	let tempBusiness = userdbAccess.db(db);

	//Business is a object with three other objects
	let business = await (async () => {
		//Promise concurrently queries the database for the three collections
		let [info, trainer, programs] = await Promise.all([
			tempBusiness.collection('info').find({}).toArray(),
			tempBusiness.collection('trainer').find({}).toArray(),
			tempBusiness.collection('programs').find({}).toArray()
		]);
        
		//Returns the query result
		return {
			info: info[0],
			trainer: trainer[0],
			programs: programs
		};
	})();

	if(!business.info){
		res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType,  unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
		return;
	}

	//If there is a logo, grab its link
	if(business.info.logo != '' && business.info.logo != null){
		business.info.logo = cloudinary.url(business.info.logo);
	}

	//If there is a profile pic for the trainer, grab its link
	if(business.trainer.trainerPic != '' && business.trainer.trainerPic  != null){
		business.trainer.trainerPic  = cloudinary.url(business.trainer.trainerPic );
	}
	
	res.render('clientViewTrainer', {loggedIn: isValidSession(req), userType: req.session.userType, business: business.info, trainer: business.trainer, programs: business.programs, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
});

app.get('/viewBusiness/:company/register/:program', sessionValidation, clientAuthorization, async(req, res) => {
	const userdb = appdb.db(req.session.userdb);

	//Connect to the specific business' database
	let db = mongodb_businessdb + '-' + req.params.company.replaceAll(/\s/g, "");
	let userdbAccess = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${db}?retryWrites=true`);
	let tempBusiness = userdbAccess.db(db);

	//Make sure the programId is a hex string
	if(req.params.program.length != 24){
		res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType,  unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
		return;
	}

	let programId = ObjectId.createFromHexString(req.params.program);

	let business = await (async () => {
		//Promise concurrently queries the database for the three collections
		let [info, trainer, programs] = await Promise.all([
			tempBusiness.collection('info').find({}).toArray(),
			tempBusiness.collection('trainer').find({}).toArray(),
			tempBusiness.collection('programs').find({}).toArray()
		]);
		//Returns the query result
		return {
			info: info[0],
			trainer: trainer[0],
			programs: programs
		};
	})();

	let [program, dogs, userTrainer] = await Promise.all([
		tempBusiness.collection('programs').find({_id: programId}).toArray(),
		userdb.collection('dogs').find({}).toArray(),
		appUserCollection.find({email: req.session.email}).toArray()
	]);

	//Make sure both business and the program exist
	if(!business.info || program.length < 1){
		res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType,  unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
		return;
	}
	
	let clientHasTrainer = userTrainer[0].companyName != null;

	for(let i = 0; i < dogs.length; i++){
		let pic = dogs[i].dogPic;
		if(pic != '' && pic != null){
			dogs[i].dogPic = cloudinary.url(pic);
		}
	}

	let contract = business.info.contract;
	let contractUrl;
	if(contract){
		contract = await downloadAndDecryptFile(contract); //nodejs buffer

		// Convert Node.js buffer to base64 string
		contractUrl = Buffer.from(contract).toString('base64');
	} else {
		contractUrl = '';
	}

	res.render('hireTrainer', {loggedIn: isValidSession(req), userType: req.session.userType, program: program[0], companyName:req.params.company, contract: contractUrl, clientHasTrainer: clientHasTrainer, dogs: dogs, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
});

app.post('/viewBusiness/:company/register/:program/submitRegister', async(req, res) => {
	const userdb = appdb.db(req.session.userdb);

	let db = mongodb_businessdb + '-' + req.params.company.replaceAll(/\s/g, "");
	let businessdbAccess = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${db}?retryWrites=true`);
	let tempBusiness = businessdbAccess.db(db);
	
	let dogId = ObjectId.createFromHexString(req.body.selectedDog);
	let programId = ObjectId.createFromHexString(req.params.program);

	let [program, dog, companyEmail] = await Promise.all([
		tempBusiness.collection('programs').find({_id: programId}).project({name: 1}).toArray(),
		userdb.collection('dogs').find({_id: dogId}).project({dogName: 1}).toArray(),
		tempBusiness.collection('info').find({}).project({email: 1}).toArray()
	]);

	let request = {
		alertType: 'hireRequest',
		dog: dog[0]._id,
		dogName: dog[0].dogName,
		program: program[0]._id,
		programName: program[0].name,
		clientEmail: req.session.email,
		clientName: req.session.name
	}

	companyEmail = companyEmail[0].email;
	await Promise.all([
		tempBusiness.collection('alerts').insertOne(request),
		appUserCollection.updateOne({companyName: req.params.company, userType:'business'}, {$inc:{unreadAlerts: 1}})
	]);

	res.redirect('/viewBusiness/' + req.params.company);
});

app.post('/resolveAlert/:alert', async(req, res) => {
	//Create an id for the alert
	let alertId = ObjectId.createFromHexString(req.params.alert);

	//Find the trainer database
	const userdb = appdb.db(req.session.userdb);

	if(req.body.resolve == 'accept'){
		//Retrieve the whole alert and create the database name for the client from it
		let alert = await userdb.collection('alerts').find({_id: alertId}).toArray();

		if(alert[0].alertType == 'hireRequest') {
			let clientEmail = alert[0].clientEmail.replaceAll('.', '');

			//Find client hiring
			const clientdb = await getdb('client-' + clientEmail);

			//Get the client's information and check if this is a new client or not
			let client = await clientdb.collection('info').find({}).project({email: 1, firstName: 1, lastName: 1, phone: 1}).toArray();
			let check = await userdb.collection('clients').find({email: client[0].email}).project({_id: 1, email: 1}).toArray();

			//Update that the client is with your business
			appUserCollection.updateOne({email: client[0].email}, {$set: {companyName: req.session.name}});

			if (check.length == 0) {
				await userdb.collection('clients').insertOne({
					email: client[0].email,
					firstName: client[0].firstName,
					lastName: client[0].lastName,
					phone: client[0].phone
				});
			}

			//Update the client's outstanding balance
			let program = await userdb.collection('programs').find({_id: alert[0].program}).toArray();
			let price;
			if(program[0].pricing.priceType == 'Hourly Rate'){
				price = (program[0].hours * program[0].pricing.price).toFixed(2);
			} else {
				price = program[0].pricing.price;
			}

			let balance = {
				dogName: alert[0].dogName,
				programName: alert[0].programName,
				credits: program[0].sessions,
				outstandingBalance: price
			};

			let registration = {
				trainer: req.session.name,
				program: alert[0].programName,
				dog: alert[0].dog,
				price: price
			}

			await Promise.all([
				clientdb.collection('outstandingBalance').insertOne(balance),
				clientdb.collection('registrations').insertOne(registration)
			]);

		}
		
	}
	
	userdb.collection('alerts').deleteOne({_id: alertId});
	res.redirect('/alerts');
});

// Temporary add Trainer button for this Branch
app.get('/addTrainer/:trainer', async (req, res) => {
	let trainer = req.params.trainer;
	await appUserCollection.updateOne({email: req.session.email}, {$set: { companyName: trainer}});
	await setTrainerDatabase(req);

	const userdb = appdb.db(req.session.userdb);
	const trainerdb = appdb.db(req.session.trainerdb);

	let client = await userdb.collection('info').find().project({email: 1, firstName: 1, lastName: 1, phone: 1}).toArray();
	let check = await trainerdb.collection('clients').find({email: client[0].email}).project({_id: 1, email: 1}).toArray();
	if (check.length == 0) {
		await trainerdb.collection('clients').insertOne({
			email: client[0].email,
			firstName: client[0].firstName,
			lastName: client[0].lastName,
			phone: client[0].phone
		});
	}

	res.redirect('/');
});


// ----------------- CALENDAR STUFF GOES HERE -------------------
async function getUserEvents(req) {
	let userEvents;
	if (req.session.userType == 'business') {
		const userdb = appdb.db(req.session.userdb);
		userEvents = await userdb.collection('eventSource').find().project({ title: 1, start: 1, end: 1 }).toArray();
	} else if (req.session.userType == 'client') {
		if (!req.session.trainerdb) {
			userEvents = null;
		} else {
			const trainerdb = appdb.db(req.session.trainerdb);
			let email = req.session.email;
			userEvents = await trainerdb.collection('eventSource').find({client: email}).project({ title: 1, start: 1, end: 1 }).toArray();
		}
	}
	return userEvents;
}

app.get('/calendar', sessionValidation, async (req, res) => {
	if (req.session.userType == 'business') {
		res.render('calendarBusiness', {loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
		return;
	} else if (req.session.userType == 'client') {
		res.render('calendarClient', {loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
	}
});

// Returns all events to the calendar
app.get('/events', sessionValidation, async (req, res) => {
	const events = await getUserEvents(req);
	res.json(events);
});

app.post('/filteredEvents', async (req, res) => {
	const clientEmail = req.body.data;
	const userdb = appdb.db(req.session.userdb);
	const filteredEvents = await userdb.collection('eventSource').find({client: clientEmail}).project({ title: 1, start: 1, end: 1 }).toArray();
	res.json(filteredEvents);
})

app.post('/getThisEvent', async (req, res) => {
	let event = {
		title: req.body.title,
		start: req.body.start,
		end: req.body.end
	}
	let result;
	if (isBusiness(req)) {
		const userdb = appdb.db(req.session.userdb);
		result = await userdb.collection('eventSource').find(event).project({_id: 1, client: 1, info: 1, notes: 1}).toArray();
	} else if (isClient(req)) {
		const trainerdb = appdb.db(req.session.trainerdb);
		result = await trainerdb.collection('eventSource').find(event).project({_id: 1, trainer: 1, info: 1}).toArray();
	}
	
	res.json(result);
});

// Returns client list to the calendar
app.post('/getClients', async (req, res) => {
	const userdb = appdb.db(req.session.userdb);
	const clientList = await userdb.collection('clients').find().project({ email: 1, _id: 1 }).toArray();
	res.json(clientList);
});

app.post('/addEvent', async (req, res) => {
    const userdb = appdb.db(req.session.userdb);
    const date = req.body.calModDate;
    const startDateStr = date + "T" + req.body.calModStartHH + ":" + req.body.calModStartMM + ":00";
    const endDateStr = date + "T" + req.body.calModEndHH + ":" + req.body.calModEndMM + ":00";
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const trainerName = req.session.name;
    const clientEmail = req.body.calModClient;
    const eventInfo = req.body.calModInfo;
	const eventNotes = req.body.calModNotes;
    const event = {
        title: req.body.calModTitle,
        start: startDateStr,
        end: endDateStr,
        trainer: trainerName,
        client: clientEmail,
        info: eventInfo,
		notes: eventNotes
    };

    // Check for duplicate event
    let check = await userdb.collection('eventSource').find({
        title: event.title,
        start: event.start,
        end: event.end,
        client: event.client
    }).project({_id: 1}).toArray();

    if (check.length > 0) {
        // TODO DUPE ERROR EXIT HERE
    } else {
        await userdb.collection('eventSource').insertOne(event);
    }

    const businessEmail = req.session.email;

    // Schedule the email to be sent immediately after the event is added
    await sendEmail(
        [businessEmail, clientEmail],
        'New Appointment - Pawfolio',
        event.title,
        startDate.toDateString(),
        startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        userdb
    );

    res.redirect('/calendar');
});

app.post('/updateEvent', async (req, res) => {
	// Checks if previous page was a Calendar or Session
	const calOrSess = req.body.calOrSess;
	const userdb = appdb.db(req.session.userdb);
	const date = req.body.calModDate;
	const startNew = date + "T" + req.body.calModStartHH + ":" + req.body.calModStartMM + ":00";
	const endNew = date + "T" + req.body.calModEndHH + ":" + req.body.calModEndMM + ":00";
	if (req.body.eventPassed == 'false') {
		const eventOrig = {
			title: req.body.calModTitleOrig,
			start: req.body.calModStartOrig,
			end: req.body.calModEndOrig,
			client: req.body.calModEmailOrig,
			info: req.body.calModInfoOrig
		}

		const eventNew = {
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
	} else {
		const eventOrig = {
			title: req.body.calModTitleOrig,
			start: req.body.calModStartOrig,
			end: req.body.calModEndOrig,
			client: req.body.calModEmailOrig,
			info: req.body.calModInfoOrig,
			notes: req.body.calModNotesOrig
		}
		const eventNew = {
			notes: req.body.calModNotes
		}

		await userdb.collection('eventSource').updateOne({
			title: eventOrig.title,
			start: eventOrig.start,
			end: eventOrig.end,
			client: eventOrig.client,
			info: eventOrig.info,
			notes: eventOrig.notes
		}, {
			$set: {
				title: eventOrig.title,
				start: eventOrig.start,
				end: eventOrig.end,
				client: eventOrig.client,
				info: eventOrig.info,
				notes: eventNew.notes
			}
		});
	}


	if (calOrSess == 'calendar') {
		res.redirect('/calendar');
		return;
	} else if (calOrSess == 'session') {
		res.redirect('/sessionList');
	}
});

app.post('/removeEvent', async (req, res) => {
	// Checks if previous page was a Calendar or Session
	const calOrSess = req.body.calOrSess;

	const userdb = appdb.db(req.session.userdb);

	const calTitle = req.body.calModTitleOrig;
	const calStart = req.body.calModStartOrig;
	const calEnd = req.body.calModEndOrig;
	const calEmail = req.body.calModEmailOrig;
	const calInfo = req.body.calModInfoOrig;

	await userdb.collection('eventSource').deleteOne({
		title: calTitle,
		start: calStart,
		end: calEnd,
		client: calEmail,
		info: calInfo
	});
	if (calOrSess == 'calendar') {
		res.redirect('/calendar');
		return;
	} else if (calOrSess == 'session') {
		res.redirect('/sessionList');
	}
});

app.post('/getTrainer', async (req, res) => {
	const thisUser = await appUserCollection.find({email: req.session.email}).toArray();
	const companyName = thisUser[0].companyName;
	res.json(companyName);
});

app.post('/requestEvent', async (req, res) => {
	const trainerdb = appdb.db(req.session.trainerdb);
    const date = req.body.calModDate;
    const startDateStr = date + "T" + req.body.calModStartHH + ":" + req.body.calModStartMM + ":00";
    const endDateStr = date + "T" + req.body.calModEndHH + ":" + req.body.calModEndMM + ":00";
    const trainerName = req.body.calModTrainer;
    const clientEmail = req.session.email;
    const eventInfo = req.body.calModInfo;
    const event = {
		alertType: 'sessionRequest',
        title: req.body.calModTitle,
        start: startDateStr,
        end: endDateStr,
		trainer: trainerName,
        client: clientEmail,
        info: eventInfo
    };
	await trainerdb.collection('sessionRequests').insertOne(event);
	await appUserCollection.updateOne({companyName: trainerName, userType: 'business'}, {$inc:{unreadAlerts: 1}});
	res.redirect('/calendar');
});

app.get('/alerts/session/:alert', sessionValidation, async (req, res) => {
	const userdb = appdb.db(req.session.userdb);
	if (req.session.userType == 'business') {
		appUserCollection.updateOne({email: req.session.email}, {$set:{unreadAlerts: 0}});

		// Make sure alert is a valid alertId
		if(req.params.alert.length != 24){
			res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType,  unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
			return;
		}

		let alertId = ObjectId.createFromHexString(req.params.alert);
		let alert = await userdb.collection('sessionRequests').find({_id: alertId}).toArray();
		
		//Make sure alert is a valid alertId
		if(!alert[0]){
			res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType,  unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
			return;
		}

		alert[0].start = new Date(alert[0].start).toLocaleString("en-CA");
		alert[0].end = new Date(alert[0].end).toLocaleString("en-CA");
		res.render('sessionAlertView', {
            loggedIn: isValidSession(req),
            userType: req.session.userType,
            alert: alert[0],
            unreadAlerts: req.session.unreadAlerts,
            unreadMessages: req.session.unreadMessages
        });
	} else {
		res.redirect('/');
	}
})

app.post('/resolveSessionAlert/:alert', async (req, res) => {
	//Create an id for the alert
	let alertId = ObjectId.createFromHexString(req.params.alert);

	const userdb = appdb.db(req.session.userdb);

	if (req.body.resolve == 'accept') {
		const alert = await userdb.collection('sessionRequests').find({_id: alertId}).toArray();

		if (alert[0].alertType == 'sessionRequest') {
			const check = await userdb.collection('eventSource').find({title: alert[0].title, start: alert[0].start, end: alert[0].end}).toArray();
			if (check.length == 0) {
				await userdb.collection('eventSource').insertOne({
					title: alert[0].title,
					start: alert[0].start,
					end: alert[0].end,
					trainer: alert[0].trainer,
					client: alert[0].client,
					info: alert[0].info
				});
			}
		}
	}
	userdb.collection('sessionRequests').deleteOne({_id: alertId});
	res.redirect('/alerts');
})

// ----------------- MESSAGING SECTION STARTS HERE -------------------

function encryptMessage(text) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.randomBytes(32).toString('hex');
    const iv = crypto.randomBytes(16).toString('hex');

    let cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return { iv, encryptedData: encrypted.toString('hex'), key };
}

function decryptMessage(encryptedText, iv, key) {
    const keyBuffer = Buffer.from(key, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    const encryptedTextBuffer = Buffer.from(encryptedText, 'hex');

    let decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
    let decrypted = decipher.update(encryptedTextBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}

app.get('/chatSelectClient', sessionValidation, async (req, res) => {
	const userdb = appdb.db(req.session.userdb);
	if (isClient(req)) {
		res.redirect('/chat/client');
		return;
	} else if (isBusiness(req)) {
		const clientList = await userdb.collection('clients').find().project({email: 1}).toArray();
		res.render('chatSelectClient', {loggedIn: isValidSession(req), userType: req.session.userType, clients: clientList, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages, unreadMessages: req.session.unreadMessages});
	}
});

app.get('/chat/:type', sessionValidation, async (req, res) => {
	req.session.unreadMessages = 0;
	const type = req.params.type;
	if (type == 'client' && req.session.trainerdb) {
		const receiver = await appUserCollection.find({email: req.session.email}).project({companyName: 1}).toArray();
		res.render('chatClient', { loggedIn: isValidSession(req), userType: req.session.userType, receiver: receiver[0].companyName, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages, unreadMessages: req.session.unreadMessages});
		return;
	} else if (isBusiness(req)) {
		setClientDatabase(req, type);
		const clientdb = appdb.db(req.session.clientdb);
		const receiver = await clientdb.collection('info').find().project({email: 1}).toArray();

		//Check that the reciever exists
		if(!receiver[0]) {
			res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType,  unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
			return;
		}

		res.render('chatBusiness', { loggedIn: isValidSession(req), userType: req.session.userType, clientParam: type, receiver: receiver[0].email, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages, unreadMessages: req.session.unreadMessages});
	} else {
		res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType,  unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
	}
});

app.get('/messagesClient', sessionValidation, async (req, res) => {
	const userdb = appdb.db(req.session.userdb);
	const trainerdb = appdb.db(req.session.trainerdb);
	const senderMsgList = await userdb.collection('messages').find().sort({ createdAt: 1 }).limit(25).toArray();
	const receiverMsgList = await trainerdb.collection('messages').find({receiver: req.session.email}).sort({ createdAt: 1 }).limit(25).toArray();

	// Decrypt messages
	senderMsgList.forEach(msg => {
		msg.text = decryptMessage(msg.text, msg.iv, msg.key);
	});
    receiverMsgList.forEach(msg => {
        msg.text = decryptMessage(msg.text, msg.iv, msg.key);
    });

	res.json({ senderMessages: senderMsgList, receiverMessages: receiverMsgList });
});

app.post('/messagesClient', async (req, res) => {
	const userdb = appdb.db(req.session.userdb);
	const { text } = req.body;
	const sender = req.session.email;
	const trainer = await appUserCollection.find({ email: sender }).project({ companyName: 1 }).toArray();
	const receiver = trainer[0].companyName;
	const newMessage = {receiver: receiver, createdAt: new Date(), unread: true };

	// Encrypt the message text before saving
	const { iv, encryptedData, key} = encryptMessage(text);
	newMessage.text = encryptedData;
	newMessage.iv = iv;
	newMessage.key = key;

	await userdb.collection('messages').insertOne(newMessage);
	res.status(201).json(newMessage);
});

app.put('/messagesClient/markRead', async (req, res) => {
	const trainerdb = appdb.db(req.session.trainerdb);
	await trainerdb.collection('messages').updateMany({receiver: req.session.email}, { $set: { unread: false }});
	res.status(200).send('Messages marked as read');
});

app.get('/messagesBusiness/:client', sessionValidation, businessAuthorization, async (req, res) => {
	setClientDatabase(req, req.params.client);
	const userdb = appdb.db(req.session.userdb);
	const clientdb = appdb.db(req.session.clientdb);
	const client = await clientdb.collection('info').find().project({email: 1}).toArray();

	//Check that the client exists
	if(!client[0]){
		res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType,  unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
		return;
	}

	const senderMsgList = await userdb.collection('messages').find({receiver: client[0].email}).sort({ createdAt: 1 }).limit(25).toArray();
	const receiverMsgList = await clientdb.collection('messages').find().sort({ createdAt: 1 }).limit(25).toArray();

	// Decrypt messages
	senderMsgList.forEach(msg => {
		msg.text = decryptMessage(msg.text, msg.iv, msg.key);
	});
    receiverMsgList.forEach(msg => {
        msg.text = decryptMessage(msg.text, msg.iv, msg.key);
    });

	res.json({ senderMessages: senderMsgList, receiverMessages: receiverMsgList });
});

app.post('/messagesBusiness/:client', async (req, res) => {
	setClientDatabase(req, req.params.client);
	const userdb = appdb.db(req.session.userdb);
	const clientdb = appdb.db(req.session.clientdb);
	const { text } = req.body;
	const client = await clientdb.collection('info').find().project({email: 1}).toArray();
	const receiver = client[0].email;
	const newMessage = {receiver: receiver, createdAt: new Date(), unread: true };

	// Encrypt the message text before saving
	const { iv, encryptedData, key} = encryptMessage(text);
	newMessage.text = encryptedData;
	newMessage.iv = iv;
	newMessage.key = key;

	await userdb.collection('messages').insertOne(newMessage);
	res.status(201).json(newMessage);
});

app.put('/messagesBusiness/markRead/:client', sessionValidation, businessAuthorization, async (req, res) => {
	setClientDatabase(req, req.params.client);
	const clientdb = appdb.db(req.session.clientdb);
	await clientdb.collection('messages').updateMany({receiver: req.session.name}, { $set: { unread: false }});
	res.status(200).send('Messages marked as read');
});

app.get('/messagesPreview', sessionValidation,  businessAuthorization, async (req, res) => {
	const userdb = appdb.db(req.session.userdb);
	const clients = await userdb.collection('clients').find().toArray();
	let clientArray = [];
	if (clients.length > 0) {
		for (let i = 0; i < clients.length; i++) {
			setClientDatabase(req, clients[i].email);
			const clientdb = appdb.db(req.session.clientdb);
			const clientInfo = await clientdb.collection('info').find().toArray();
			const clientMessages = await clientdb.collection('messages').find({unread: true}).toArray();
			if (clientMessages.length > 0) {
				clientArray.push({
					email: clientInfo[0].email,
					msgCount: clientMessages.length
				});
			}
		}
	}
	res.json({clientMessages: clientArray});
});

// ----------------- ALERTS SECTION STARTS HERE -------------------

app.get('/alerts', sessionValidation, async(req, res)=>{
	const userdb = appdb.db(req.session.userdb);

	let [alerts] = await Promise.all([
		userdb.collection('alerts').find({}).toArray(),
		appUserCollection.updateOne({email: req.session.email}, {$set: {unreadAlerts: 0}})
	]);
	await updateUnreadAlertsMidCode(req);
	
	if(req.session.userType == 'business'){

		// Check for session requests from clients
		let reqSessions = await userdb.collection('sessionRequests').find().toArray();
		if (reqSessions.length > 0) {
			for (let i = 0; i < reqSessions.length; i++) {
				reqSessions[i].start = new Date(reqSessions[i].start).toLocaleString("en-CA");
				reqSessions[i].end = new Date(reqSessions[i].end).toLocaleString("en-CA");
			}
		}


		res.render('businessAlerts', {
            loggedIn: isValidSession(req),
            userType: req.session.userType,
            alerts: alerts,
			reqSessions: reqSessions,
            unreadAlerts: req.session.unreadAlerts,
            unreadMessages: req.session.unreadMessages
        });
	} else {
		res.render('clientAlerts', {
            loggedIn: isValidSession(req),
            userType: req.session.userType,
            alerts: alerts,
            unreadAlerts: req.session.unreadAlerts,
            unreadMessages: req.session.unreadMessages
        });
	}
});

app.post('/alerts/delete/:alert', async(req, res) => {
	const userdb = appdb.db(req.session.userdb);

	let alert = new ObjectId(req.params.alert);
	userdb.collection('alerts').deleteOne({_id: alert});

	res.redirect('/alerts');
});


app.get('/alerts/view/:alert', sessionValidation, async(req, res) => {
	const userdb = appdb.db(req.session.userdb);
	if(req.session.userType == 'business'){
		appUserCollection.updateOne({email: req.session.email}, {$set:{unreadAlerts: 0}});

		
		//Make sure alert is a valid alertId
		if(req.params.alert.length != 24){
			res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType,  unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
			return;
		}

		let alertId = ObjectId.createFromHexString(req.params.alert);
		let alert = await userdb.collection('alerts').find({_id: alertId}).toArray();
		
		//Make sure alert is a valid alertId
		if(!alert[0]){
			res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType,  unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
			return;
		}


		let clientEmail = alert[0].clientEmail.split('.').join("");
		let db = mongodb_clientdb + '-' + clientEmail;
		let clientdbAccess = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${db}?retryWrites=true`);
		let clientInfo = clientdbAccess.db(db);

		let [dog, address] = await Promise.all([
			clientInfo.collection('dogs').find({_id: alert[0].dog}).toArray(),
			clientInfo.collection('info').find({}).project({address: 1}).toArray()
		]);

		if(dog[0].dogPic != '' && dog[0].dogPic != null){
			dog[0].dogPic = cloudinary.url(dog[0].dogPic);
		}

		res.render('hireAlertView', {
            loggedIn: isValidSession(req),
            userType: req.session.userType,
            alert: alert[0],
            dog: dog[0],
            address: address[0].address,
            unreadAlerts: req.session.unreadAlerts,
            unreadMessages: req.session.unreadMessages
        });
	} else {
		res.redirect('/');
	}
});

app.get('/api/clients', async (req, res) => {
    const userdb = appdb.db(req.session.userdb);
	const clientList = await userdb.collection('clients').find().project({email: 1}).toArray();
	// clientList = await appUserCollection.find({userType: 'client'}).project({_id: 1, email: 1, firstName: 1, lastName: 1}).toArray();
	let clientsParsed = [];
    for (let i = 0; i < clientList.length; i++) {
        setClientDatabase(req, clientList[i].email);
        const clientdb = appdb.db(req.session.clientdb);
        const clientOut = await clientdb.collection('info').find().project({_id: 1, email: 1, firstName: 1, lastName: 1}).toArray();

		const dogOut = await clientdb.collection('dogs').find().project({dogPic: 1, dogName: 1}).toArray();
		
		// process the cloud links
		for(let j = 0; j < dogOut.length; j++) {
			let dogPicUrl;
			let dogPic = dogOut[j].dogPic

			if(dogPic != '') {
				dogPicUrl = cloudinary.url(dogPic);
			}
			
			dogOut[j].dogPic = dogPicUrl;
		}
	
        clientsParsed.push({
            _id: clientOut[0]._id,
            email: clientOut[0].email,
            firstName: clientOut[0].firstName,
            lastName: clientOut[0].lastName,
			dogs: dogOut
        });
    }
	res.send(clientsParsed)
});

app.get('/clientList', sessionValidation, businessAuthorization, async (req, res) => {

	// Kevin - output an array of objects from client's databases that have hired this trainer
	const userdb = appdb.db(req.session.userdb);
	const clientList = await userdb.collection('clients').find().project({email: 1}).toArray();
	let clientListArray = [];
	let dogListArray = [];
    for (let i = 0; i < clientList.length; i++) {
        setClientDatabase(req, clientList[i].email);
        const clientdb = appdb.db(req.session.clientdb);
        const clientOut = await clientdb.collection('info').find().project({_id: 1, email: 1, firstName: 1, lastName: 1}).toArray();

		const dogOut = await clientdb.collection('dogs').find().project({dogPic: 1, dogName: 1}).toArray();
		
		// process the cloud links
		for(let j = 0; j < dogOut.length; j++) {
			let dogPicUrl;
			let dogPic = dogOut[j].dogPic

			if(dogPic != '') {
				dogPicUrl = cloudinary.url(dogPic);
			}
			
			dogOut[j].dogPic = dogPicUrl;
		}
		
        clientListArray.push({
            _id: clientOut[0]._id,
            email: clientOut[0].email,
            firstName: clientOut[0].firstName,
            lastName: clientOut[0].lastName,
			dogs: dogOut
        });
		
		
    }

	res.render('clientList', {clientArray: clientListArray, loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
});

app.get('/clientProfile/:id', sessionValidation,  businessAuthorization, async (req, res) => {

	// Get a list of all clients
	// const clients = await appUserCollection.find({userType: 'client'}).project({id: 1, email: 1, firstName: 1, lastName: 1, phone: 1}).toArray();
	
	// Kevin - Return an array of ids and emails from the client's database
	const userdb = appdb.db(req.session.userdb);
	const clients = await userdb.collection('clients').find().project({email: 1}).toArray();
	let clientArray = [];
	for (let i = 0; i < clients.length; i++) {
		setClientDatabase(req, clients[i].email);
		const clientdb = appdb.db(req.session.clientdb);
		const client = await clientdb.collection('info').find().project({_id: 1, email: 1}).toArray();
		clientArray.push({
			_id: client[0]._id,
			email: client[0].email
		});
	}
	// Map their id's to a string
	// const ids = clients.map(item => item._id.toString());
	const ids = clientArray.map(item => item._id.toString());

	// variable to store the client
	let targetClient;

	for (let i = 0; i < clientArray.length; i++) {
		if (ids[i] === req.params.id) {
			targetClient = clientArray[i];
		}
	}

	//Make sure the targetClient exists
	if(!targetClient){
		res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType,  unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
		return;
	}

	// used for locating the pfpUrl directory
	const email = targetClient.email;

	setClientDatabase(req, email);
	const clientdb = appdb.db(req.session.clientdb);

	// set the databases
	const clientdbInfo = clientdb.collection('info');
	const clientdbDogs = clientdb.collection('dogs');
    const clientdbPayments = clientdb.collection('outstandingBalance');

	targetClient = await clientdbInfo.find({}).toArray();



	//grab the array version of the pfp url
	pfpUrlProcessing = await clientdbInfo.find({email}).project({profilePic: 1}).toArray();
	
	//store the url to be passed into render
	pfpUrl = pfpUrlProcessing[0].profilePic;

	if(pfpUrl != '') {
		pfpUrl = cloudinary.url(pfpUrl);
	}

	//Gather dogs and their images if they have one
	let dogs = await clientdbDogs.find({}).toArray();
	for(let i = 0; i < dogs.length; i++){
		let pic = dogs[i].dogPic;
		if(pic != ''){
			dogs[i].dogPic = cloudinary.url(pic);
		}
	}
    
    const records = await clientdbPayments.find({}).toArray();

	let targetClientId = targetClient[0]._id.toString(); // USE LATER FOR REWORK. GIVES ID ENDING IN 2

	res.render('viewingClientProfile', {c_id: req.params.id, targetClient: targetClient[0], records: records, pfpUrl: pfpUrl, dogs: dogs, loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
});

app.post('/updateClientPayments', async (req, res) => {
    setClientDatabase(req, req.body.clientEmail);
    const clientdb = appdb.db(req.session.clientdb);
    const clientdbPayments = clientdb.collection('outstandingBalance');

    const updates = Object.keys(req.body).filter(key => key.startsWith('credits-') || key.startsWith('balance-'));

    for (let i = 0; i < updates.length; i++) {
        const [field, id] = updates[i].split('-');
        const value = req.body[updates[i]];

        if (field === 'credits') {
            await clientdbPayments.updateOne({ _id: new ObjectId(id) }, { $set: { credits: value } });
        } else if (field === 'balance') {
            await clientdbPayments.updateOne({ _id: new ObjectId(id) }, { $set: { outstandingBalance: value } });
        }
    }
    
    res.redirect('/clientProfile/' + req.body.clientId);
});

app.get('/clientProfile/:c_id/dogView/:d_id', businessAuthorization, async (req, res) => {

	// Get a list of all clients

	// Kevin - Return an array of ids and emails from the client's database
	const userdb = appdb.db(req.session.userdb);
	const clients = await userdb.collection('clients').find().project({email: 1}).toArray();
	let clientArray = [];
	for (let i = 0; i < clients.length; i++) {
		setClientDatabase(req, clients[i].email);
		const clientdb = appdb.db(req.session.clientdb);
		const client = await clientdb.collection('info').find().project({_id: 1, email: 1}).toArray();
		clientArray.push({
			_id: client[0]._id,
			email: client[0].email
		});
	}

	// Map their id's to a string
	const ids = clientArray.map(item => item._id.toString());

	// variable to store the client
	let targetClient;

	for (let i = 0; i < clientArray.length; i++) {
		if (ids[i] === req.params.c_id) {
			targetClient = clientArray[i];
		}
	}

	// used for locating the pfpUrl directory
	const email = targetClient.email;

	setClientDatabase(req, email);
	const clientdb = await getdb(req.session.clientdb);

	let clientId = await clientdb.collection('info').find().toArray();
	// console.log(clientId);

	// clientId = clientId[0]._id;

	// console.log(clientId);

	// clientId = clientId.toString();

	// console.log(clientId);

	// set the database
	const clientdbDogs = clientdb.collection('dogs');
	let targetDogs = await clientdbDogs.find({}).toArray();

	// map ids
	const dogIds = targetDogs.map(item => item._id.toString());
	
	// look for target dog
	let targetDog; 
	for (let i = 0; i < targetDogs.length; i++) {
		if (dogIds[i] = req.params.d_id) {
			targetDog = targetDogs[i];
		}
	}

	// parse dog image
	let pic = targetDog.dogPic;
	if(pic != ''){
		targetDog.dogPic = cloudinary.url(pic);
	}

	res.render('dogProfileView', {loggedIn: isValidSession(req), userType: req.session.userType, clientId: clientId[0]._id.toString(), dog: targetDog, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages})
});

// ----------------- SESSIONS SECTION STARTS HERE -------------------

app.get('/sessionList',sessionValidation, async (req, res) => {
	if ( req.session.userType == 'business') {
		res.render('sessionsBusiness', {loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
		return;
	} else if (req.session.userType == 'client') {
		res.render('sessionsClient', {loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
	}
});

app.use(express.static(__dirname + "/public"));

app.get('*', (req, res) => {
	res.status(404);
	res.render('errorMessage', { errorTitle: '404', errorMsg: 'Looks like you\'re barking up the wrong tree!', loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts, unreadMessages: req.session.unreadMessages});
});

app.listen(port, () => {
	console.log("Node application listening on port " + port);
});
