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

//END OF GOOGLE CLOUD STORAGE

const nodemailer = require('nodemailer');
const crypto = require('crypto')
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

// var { database } = include('databaseConnection');

//Creating a MongoClient and using it to connect to a specified database
const MongoClient = require("mongodb").MongoClient;
// let atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${database}?retryWrites=true`;
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

// Passes a variable called 'currentUrl' to whatever page we're on.
app.use((req, res, next) => {
    res.locals.currentUrl = req.originalUrl; // I don't think we're doing any internal routing, but for safety, I'm using originalUrl instead of url to prevent issues in the future.
    next();
});

app.use(session({
	secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false,
	resave: true
}));

// Use the updateUnreadAlerts middleware for all routes
//middleWare
async function updateUnreadAlerts(req, res, next) {
    if (req.session && req.session.email) {
        try {
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
//Function to call
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
	res.render('index', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
});

app.get('/about',  (req, res) => {
	res.render('about', {loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
});

app.get('/test', (req, res) => {
	res.render('test', {loggedIn: true, name: 'Test User', userType: 'business', unreadAlerts: 0});
});

app.get('/FAQ', (req, res) => {
	res.render('FAQ', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
});

app.get('/clientResources', (req, res) => {
	res.render('clientResources', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
});

app.get('/login/:loginType', (req, res) => {
	res.render(req.params.loginType, {loggedIn: isValidSession(req), loginType: req.params.loginType, unreadAlerts: 0});
})

// I think this does nothing so I'll comment out, but delete later.
// app.get('/business/:action', (req, res) => {
// 	if(res.params.action == 'login'){
// 		res.render('businessLogin', {loggedIn: isValidSession(req), userType: req.session.userType});
// 	}
// })

//Page to choose what account to sign up for (business or client)
app.get('/signup', (req, res) => {
	res.render('signupChoice', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
});

//Renders form for business or client sign up
app.get('/signup/:form', (req, res) => {
	let form = req.params.form;
	if (form == "business") {
		res.render('signUpBusiness.ejs', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
	} else if (form == "client") {
		res.render('signUpClient.ejs', {loggedIn: isValidSession(req), name: req.session.name, userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
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
			userType: 'client',
			unreadAlerts: 0
		});

		//Update the session for the now logged in user
		req.session.authenticated = true;
		req.session.email = user.email;
		req.session.name = user.firstName + ' ' + user.lastName;
		req.session.userType = 'client';
		req.session.cookie.maxAge = expireTime;
		req.session.unreadAlerts = 0;

		await setUserDatabase(req);
		const userdb = await getdb(req.session.userdb);

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
				companyName: Joi.string().pattern(/^[a-zA-Z0-9\s-']*$/).max(40).required(),
				businessEmail: Joi.string().email().required(),
				businessPhone: Joi.string().pattern(/^[0-9\s]*$/).length(10).required(),
				firstName: Joi.string().pattern(/^[a-zA-Z\s]*$/).max(20).required(),
				lastName: Joi.string().pattern(/^[a-zA-Z\s]*$/).max(20).required(),
				companyWebsite: Joi.string().pattern(/^(https?:\/\/)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/).allow(null, ''),
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
			console.log(validationRes.error);
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
		const userdb = await getdb(req.session.userdb);

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
	var result = await appUserCollection.find({ email: email }).project({ email: 1, companyName: 1, firstName: 1, lastName: 1, password: 1, userType: 1, _id: 1, unreadAlerts: 1}).toArray();

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

		res.redirect('/loggedIn'); // redirect to home page
		return;
	} else {

		// if the password is incorrect, say so
		res.render('errorMessage', {loggedIn: isValidSession(req), userType: req.session.userType, error: 'Password is incorrect' , unreadAlerts: req.session.unreadAlerts});
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
				res.render('errorMessge', { error: 'Email couldn\'t be sent', loggedIn: false, userType: null , unreadAlerts: 0})
			}
		});
	});
}

// This function sets up the reminder emails to be sent. Sets up sending an email an hour before, and 24 hours before the appointment.
async function sendReminderEmails() {
	const userdb = await getdb(req.session.userdb);
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
        //const oneDayBefore = new Date(eventTime.getTime() - 24 * 60 * 60 * 1000);
        //const oneHourBefore = new Date(eventTime.getTime() - 60 * 60 * 1000);

//        if (now >= oneDayBefore && now < oneDayBefore + 60 * 1000) {
//            await scheduleEmail(user.email, 'Appointment Reminder', `You have an appointment scheduled for tomorrow at ${event.start}.`, 0);
//        } else if (now >= oneHourBefore && now < oneHourBefore + 60 * 1000) {
//            await scheduleEmail(user.email, 'Appointment Reminder', `You have an appointment scheduled in one hour at ${event.start}.`, 0);
//        }
    }
}

//setInterval(sendReminderEmails, 15 * 60 * 1000);

// This function sends other types of emails. Right now I'm adding it so that you can send appointment information. (but you can parse anything you want, really.)
async function sendEmail(to, subject, eventTitle, eventDate, eventStartTime, eventEndTime) {
    ejs.renderFile('./views/reminderEmail.ejs', { 
        eventTitle: eventTitle,
        eventDate: eventDate,
        eventStartTime: eventStartTime,
        eventEndTime: eventEndTime
    }, (err, str) => {
        if (err) {
            console.error('Error rendering email template', err);
            return;
        }
        
        const mailOptions = {
            from: autoreply_email,
            to: to,
            subject: subject,
            html: str
        };

        try {
            transporter.sendMail(mailOptions);
            // console.log(`Email sent to ${to}`);
        } catch (error) {
            console.error(`Error sending email to ${to}:`, error); 
            throw error;
        }
    });
}

// Sets up a queue so that emails can be sent even if the app is closed
// This doesn't work :(
//let emailQueue = new Queue('emailQueue', {
//    redis: {
//        host: '127.0.0.1',
//        port: 6379,
//        maxRetriesPerRequest: 10000,
//    },
//    defaultJobOptions: {
//        attempts: 10000,
//        backoff: {
//            type: 'exponential',
//            delay: 60 * 1000,
//        },
//    },
//});
//
//
//emailQueue.process(async (job) => {
//    console.log("We're in the email queue");
//    const { to, subject, text } = job.data;
//    try {
//        sendEmail(to, subject, text); //Removed an await
//        console.log(`Email sent successfully to ${to}`);
//    } catch (error) {
//        console.error(`Failed to send email to ${to}, will retry...`, error);
//        throw error;
//    }
//});
//
//async function scheduleEmail(to, subject, text, delay) {
//    console.log("Do we even get here 😭");
//    try {
//        emailQueue.add(
//            { to, subject, text },
//            { delay }
//        );
//        console.log(`Scheduled email to ${to} with subject "${subject}" and delay of ${delay}ms`);
//    } catch (error) {
//        console.error(`Error scheduling email to ${to}:`, error);
//    }
//}


// This routing is the main page for forgetting your password.
app.get('/forgotPassword', (req, res) => {

	// If the email is invalid, the query will have an error message. Otherwise, we want it blank so it doesn't always show
	const errorMessage = req.query.errorMessage || '';
	res.render('forgotPassword', { errorMessage: errorMessage, loggedIn: false, userType: null, unreadAlerts: 0});
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
		res.render('errorMessage', { error: 'Token expired or invalid.', loggedIn: false, userType: null, unreadAlerts: 0})
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
	res.render('resetPasswordForm', { token: token.token, loggedIn: false, userType: null , unreadAlerts: 0});
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
	res.render('passwordChangedSuccessfully', {loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
});

app.get('/emailSent', (req, res) => {
	res.render('checkInbox', {loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
});

app.get('/logout', (req, res) => {
	req.session.destroy();
	// res.render('logout', {loggedIn: false, userType: null});
	res.redirect('/');
});

//Async function for uploading an immage

//Client user profile page
app.get('/profile', sessionValidation, async(req, res) => {

	const userdb = await getdb(req.session.userdb);

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
			if(pic != '' && pic != null){
				dogs[i].dogPic = cloudinary.url(pic);
			}
		}

		//Render client profile page
		res.render('clientProfile', {loggedIn: isValidSession(req), user: user, dogs: dogs, userName: req.session.name, userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
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
			res.render('businessProfile', {loggedIn: isValidSession(req), business: user, trainer: trainer, programs: programs, businessTab: '', trainerTab: 'checked', programsTab: '', userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
		} else if(req.query.tab == 'program'){
			res.render('businessProfile', {loggedIn: isValidSession(req), business: user, trainer: trainer, programs: programs, businessTab: '', trainerTab: '', programsTab: 'checked', userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
		} else {
			res.render('businessProfile', {loggedIn: isValidSession(req), business: user, trainer: trainer, programs: programs, businessTab: 'checked', trainerTab: '', programsTab: '', userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
		}
	}
});

//Profile Editting (both client and business)
app.post('/profile/edit/:editType', sessionValidation, upload.array('accountUpload', 1), async(req, res) => {
	const userdb = await getdb(req.session.userdb);

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
		let business = await userdb.collection('info').find({email: req.session.email}).project({logo: 1}).toArray();

		//Logo id is updated with a newly upload logo or kept the same
		if(req.files.length != 0){
			await deleteUploadedImage(business[0].logo);
			req.body.logo = await uploadImage(req.files[0], "businessLogos");
		} else {
			req.body.logo = business[0].logo;
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
	const userdb = await getdb(req.session.userdb);

	//Use program id to access program
	let programId =  ObjectId.createFromHexString(req.params.programId);
	let program = await userdb.collection('programs').find({_id: programId}).toArray();

	//Render program page with the specific program details
	res.render('programDetails', {loggedIn: isValidSession(req), userType: req.session.userType, program: program[0], unreadAlerts: req.session.unreadAlerts});
});

//Edit specific program
app.post('/program/:programId/edit', async(req, res) => {
	const userdb = await getdb(req.session.userdb);

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
	res.render('addDog', {loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
});

//Adds the dog to the database
app.post('/addingDog', upload.array('dogUpload', 6), async (req, res) => {
    const userdb = await getdb(req.session.userdb);

	//validation schema
	var schema = Joi.object(
		{
			dogName: Joi.string().pattern(/^[a-zA-Z\s\'\-]*$/).max(20),
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
	const userdb = await getdb(req.session.userdb);

	//Use the dog document id to find the specific dog
	let dogId =  ObjectId.createFromHexString(req.params.dogId);
	let dogRecord = await userdb.collection('dogs').find({_id: dogId}).toArray();

	//If there is a dog pic attached to this dog, create a link to it
	if(dogRecord[0].dogPic != ''){
		dogRecord[0].dogPic = cloudinary.url(dogRecord[0].dogPic);
	}

	//Render the dog's profile
	res.render('dogProfile', {loggedIn: isValidSession(req), userType: req.session.userType, dog: dogRecord[0], unreadAlerts: req.session.unreadAlerts});
});

//Edit specific dog
app.post('/dog/:dogId/edit',upload.single('dogUpload'), async(req, res) => {
	const userdb = await getdb(req.session.userdb);

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
	const userdb = await getdb(req.session.userdb);

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
	res.render('accountDeletion', {loggedIn: isValidSession(req), name: req.session.name , userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
});

app.post('/deleteAccount', async (req, res) => {
	const userdb = await getdb(req.session.userdb);
	// Store the email
	let email = req.session.email;

	// Logic for business accounts and clients (safe coding)
	if (req.session.userType == 'client') {
		if (req.session.trainerdb) {
			const trainerdb = await getdb(req.session.trainerdb);
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
		// console.log(name);

		//Establish connection the user database
		let db = mongodb_businessdb + '-' + name.replaceAll(/\s/g, "");
		let userdbAccess = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${db}?retryWrites=true`);
		let tempBusiness = userdbAccess.db(db);
		// console.log(tempBusiness);

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

	res.render('viewTrainers', {loggedIn: isValidSession(req), userType: req.session.userType, businesses: businessDetails, trainers: businessTrainers, unreadAlerts: req.session.unreadAlerts});
});

//Temporary code from calendar testing; changed address to just /trainer
app.get('/trainer', async (req, res) => {
	const trainers = await appUserCollection.find({ userType: 'business' }).project({ _id: 1, companyName: 1 }).toArray();
	res.render('findTrainer', {loggedIn: isValidSession(req), userType: req.session.userType, trainers: trainers, unreadAlerts: req.session.unreadAlerts});
});

//View indivdual business
app.get('/viewBusiness/:company', async(req, res) => {
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

	//If there is a logo, grab its link
	if(business.info.logo != '' && business.info.logo != null){
		business.info.logo = cloudinary.url(business.info.logo);
	}

	//If there is a profile pic for the trainer, grab its link
	if(business.trainer.trainerPic != '' && business.trainer.trainerPic  != null){
		business.trainer.trainerPic  = cloudinary.url(business.trainer.trainerPic );
	}
	
	res.render('clientViewTrainer', {loggedIn: isValidSession(req), userType: req.session.userType, business: business.info, trainer: business.trainer, programs: business.programs, unreadAlerts: req.session.unreadAlerts});
});

app.get('/viewBusiness/:company/register/:program', async(req, res) => {
	const userdb = await getdb(req.session.userdb);

	//Connect to the specific business' database
	let db = mongodb_businessdb + '-' + req.params.company.replaceAll(/\s/g, "");
	let userdbAccess = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${db}?retryWrites=true`);
	let tempBusiness = userdbAccess.db(db);

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

	let program = await tempBusiness.collection('programs').find({_id: programId}).toArray();
	let dogs = await userdb.collection('dogs').find({}).toArray();
	for(let i = 0; i < dogs.length; i++){
		let pic = dogs[i].dogPic;
		if(pic != '' && pic != null){
			dogs[i].dogPic = cloudinary.url(pic);
		}
	}

	res.render('hireTrainer', {loggedIn: isValidSession(req), userType: req.session.userType, program: program[0], dogs: dogs, unreadAlerts: req.session.unreadAlerts});
});


app.post('/viewBusiness/:company/register/:program/submitRegister', async(req, res) => {
	const userdb = await getdb(req.session.userdb);

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
		appUserCollection.updateOne({email: companyEmail, userType:'business'}, {$inc:{unreadAlerts: 1}})
	]);
	
	// CHANGE LATER TEMPORARY CODE TO AUTO HIRE THE TRAINER FOR NOW
	const companyName = await tempBusiness.collection('info').find().project({companyName: 1}).toArray();
	res.redirect('/addTrainer/' + companyName[0].companyName);
	// res.redirect('/findTrainer');
});


// Temporary add Trainer button for this Branch
app.get('/addTrainer/:trainer', async (req, res) => {
	let trainer = req.params.trainer;
	await appUserCollection.updateOne({email: req.session.email}, {$set: { companyName: trainer}});
	await setTrainerDatabase(req);

	const userdb = await getdb(req.session.userdb);
	const trainerdb = await getdb(req.session.trainerdb);

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
		const userdb = await getdb(req.session.userdb);
		userEvents = await userdb.collection('eventSource').find().project({ title: 1, start: 1, end: 1 }).toArray();
	} else if (req.session.userType == 'client') {
		if (!req.session.trainerdb) {
			userEvents = null;
		} else {
			const trainerdb = await getdb(req.session.trainerdb);
			let email = req.session.email;
			userEvents = await trainerdb.collection('eventSource').find({client: email}).project({ title: 1, start: 1, end: 1 }).toArray();
		}
	}
	return userEvents;
}

app.get('/calendar', async (req, res) => {
	if (req.session.userType == 'business') {
		res.render('calendarBusiness', {loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
		return;
	} else if (req.session.userType == 'client') {
		res.render('calendarClient', {loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
	}
});

// Returns all events to the calendar
app.get('/events', async (req, res) => {
	const events = await getUserEvents(req);
	res.json(events);
});

app.post('/filteredEvents', async (req, res) => {
	const clientEmail = req.body.data;
	const userdb = await getdb(req.session.userdb);
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
		const userdb = await getdb(req.session.userdb);
		result = await userdb.collection('eventSource').find(event).project({_id: 1, client: 1, info: 1}).toArray();
	} else if (isClient(req)) {
		const trainerdb = await getdb(req.session.trainerdb);
		result = await trainerdb.collection('eventSource').find(event).project({_id: 1, trainer: 1, info: 1}).toArray();
	}
	
	res.json(result);
});

// Returns client list to the calendar
app.post('/getClients', async (req, res) => {
	const userdb = await getdb(req.session.userdb);
	const clientList = await userdb.collection('clients').find().project({ email: 1, _id: 1 }).toArray();
	res.json(clientList);
});

app.post('/addEvent', async (req, res) => {
	const userdb = await getdb(req.session.userdb);
	const date = req.body.calModDate;
	const startDateStr = date + "T" + req.body.calModStartHH + ":" + req.body.calModStartMM + ":00";
	const endDateStr = date + "T" + req.body.calModEndHH + ":" + req.body.calModEndMM + ":00";
	const startDate = new Date(startDateStr);
	const endDate = new Date(endDateStr);
	const trainerName = req.session.name;
	const clientEmail = req.body.calModClient;
	const eventInfo = req.body.calModInfo;
	const event = {
		title: req.body.calModTitle,
		start: startDateStr,
		end: endDateStr,
		trainer: trainerName,
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
    // Schedule the email to be sent immediately after the event is added
    await sendEmail(
        req.session.email,
        'New Appointment - Pawfolio',
        event.title,
        startDate.toDateString(),
        startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );

    res.redirect('/calendar');
});

app.post('/updateEvent', async (req, res) => {
	const userdb = await getdb(req.session.userdb);
	const date = req.body.calModDate;
	const startNew = date + "T" + req.body.calModStartHH + ":" + req.body.calModStartMM + ":00";
	const endNew = date + "T" + req.body.calModEndHH + ":" + req.body.calModEndMM + ":00";
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

	// update using _id, but doesn't work
	// let eventID = req.body.calModEventID;
	// console.log(eventID);
	// await userdb.collection('eventSource').updateOne({ _id: eventID }, { $set: {eventNew} });

	res.redirect('/calendar');
});

app.post('/removeEvent', async (req, res) => {
	const userdb = await getdb(req.session.userdb);

	// Delete by _id, but doesn't work
	// let eventID = req.body.calModEventID;
	// await userdb.collection('eventSource').deleteOne({ _id: eventID});

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
	res.redirect('/calendar');
});

// ----------------- MESSAGING SECTION STARTS HERE -------------------

app.get('/chatSelectClient', async (req, res) => {
	const userdb = await getdb(req.session.userdb);
	if (isClient(req)) {
		res.redirect('/chat/client');
		return;
	} else if (isBusiness(req)) {
		const clientList = await userdb.collection('clients').find().project({email: 1}).toArray();
		res.render('chatSelectClient', {loggedIn: isValidSession(req), userType: req.session.userType, clients: clientList, unreadAlerts: req.session.unreadAlerts});
	}
});

app.get('/chat/:type', async (req, res) => {
	const type = req.params.type;
	if (type == 'client') {
		const receiver = await appUserCollection.find({email: req.session.email}).project({companyName: 1}).toArray();
		res.render('chatClient', { loggedIn: isValidSession(req), userType: req.session.userType, receiver: receiver[0].companyName, unreadAlerts: req.session.unreadAlerts });
		return;
	} else if (isBusiness(req)) {
		setClientDatabase(req, type);
		const clientdb = await getdb(req.session.clientdb);
		const receiver = await clientdb.collection('info').find().project({email: 1}).toArray();
		res.render('chatBusiness', { loggedIn: isValidSession(req), userType: req.session.userType, clientParam: type, receiver: receiver[0].email, unreadAlerts: req.session.unreadAlerts });
	}
});

app.get('/messagesClient', async (req, res) => {
	const userdb = await getdb(req.session.userdb);
	const trainerdb = await getdb(req.session.trainerdb);
	const senderMsgList = await userdb.collection('messages').find().sort({ createdAt: 1 }).limit(25).toArray();
	const receiverMsgList = await trainerdb.collection('messages').find().sort({ createdAt: 1 }).limit(25).toArray();
	res.json({ senderMessages: senderMsgList, receiverMessages: receiverMsgList });
});

app.post('/messagesClient', async (req, res) => {
	const userdb = await getdb(req.session.userdb);
	const { text } = req.body;
	const sender = req.session.email;
	const trainer = await appUserCollection.find({ email: sender }).project({ companyName: 1 }).toArray();
	const receiver = trainer[0].companyName;
	const newMessage = { text, receiver: receiver, createdAt: new Date() };
	await userdb.collection('messages').insertOne(newMessage);
	res.status(201).json(newMessage);
});

app.get('/messagesBusiness/:client', async (req, res) => {
	const userdb = await getdb(req.session.userdb);
	const clientdb = await getdb(req.session.clientdb);
	const senderMsgList = await userdb.collection('messages').find().sort({ createdAt: 1 }).limit(25).toArray();
	const receiverMsgList = await clientdb.collection('messages').find().sort({ createdAt: 1 }).limit(25).toArray();
	res.json({ senderMessages: senderMsgList, receiverMessages: receiverMsgList });
});

app.post('/messagesBusiness/:client', async (req, res) => {
	const userdb = await getdb(req.session.userdb);
	const clientdb = await getdb(req.session.clientdb);
	const { text } = req.body;
	const client = await clientdb.collection('info').find().project({email: 1}).toArray();
	const receiver = client[0].email;
	const newMessage = { text, receiver: receiver, createdAt: new Date() };
	await userdb.collection('messages').insertOne(newMessage);
	res.status(201).json(newMessage);
});

// app.post('/messages', async (req, res) => {
// 	setUserDatabase(req);
// 	const { text } = req.body;
// 	let sender, receiver;
// 	if (isClient(req)) {
// 		sender = req.session.email;
// 		const trainer = await appUserCollection.find({ email: sender }).project({ companyName: 1 }).toArray();
// 		receiver = trainer[0].companyName;
// 	} else if (isBusiness(req)) {
// 		sender = req.session.name;
// 		const client = await clientdb.collection('info').find().project({email: 1}).toArray();
// 		receiver = client[0].email;
// 	}
	
// 	const newMessage = { text, receiver: receiver, createdAt: new Date() };
// 	await userdb.collection('messages').insertOne(newMessage);
// 	res.status(201).json(newMessage);
// });

// app.get('/messages', async (req, res) => {
// 	setUserDatabase(req);
// 	let senderMsgList, receiverMsgList;
// 	senderMsgList = await userdb.collection('messages').find().sort({ createdAt: 1 }).limit(25).toArray();
// 	if (isClient(req)) {
// 		setTrainerDatabase(req);
// 		receiverMsgList = await trainerdb.collection('messages').find().sort({ createdAt: 1 }).limit(25).toArray();
// 	} else if (isBusiness(req)) {

// 		receiverMsgList = await clientdb.collection('messages').find().sort({ createdAt: 1 }).limit(25).toArray();
// 	}
	
// 	res.json({ senderMessages: senderMsgList, receiverMessages: receiverMsgList });
// });

// ----------------- ALERTS SECTION STARTS HERE -------------------

app.get('/alerts', async(req, res)=>{
	const userdb = await getdb(req.session.userdb);
	if(req.session.userType == 'business'){

		let [alerts] = await Promise.all([
			userdb.collection('alerts').find({}).toArray(),
			appUserCollection.updateOne({email: req.session.email}, {$set: {unreadAlerts: 0}})
		]);
		await updateUnreadAlertsMidCode(req);

		res.render('businessAlerts', {loggedIn: isValidSession(req), userType: req.session.userType, alerts: alerts, unreadAlerts: req.session.unreadAlerts});
	} else {
		res.redirect('/');
	}
});

app.get('/alerts/view/:alert', async(req, res) => {
	const userdb = await getdb(req.session.userdb);
	if(req.session.userType == 'business'){
		appUserCollection.updateOne({email: req.session.email}, {$set:{unreadAlerts: 0}});
		let alertId = ObjectId.createFromHexString(req.params.alert);
		let alert = await userdb.collection('alerts').find({_id: alertId}).toArray();

		let clientEmail = alert[0].clientEmail.split('.').join("");
		let db = mongodb_clientdb + '-' + clientEmail;
		let clientdbAccess = new MongoClient(`mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${db}?retryWrites=true`);
		let clientInfo = clientdbAccess.db(db);

		let dog = await clientInfo.collection('dogs').find({_id: alert[0].dog}).toArray();
		if(dog[0].dogPic != '' && dog[0].dogPic != null){
			dog[0].dogPic = cloudinary.url(dog[0].dogPic);
		}

		res.render('hireAlertView', {loggedIn: isValidSession(req), userType: req.session.userType, alert: alert[0], dog: dog[0], unreadAlerts: req.session.unreadAlerts});
	} else {
		res.redirect('/');
	}
});


app.get('/clientList', async (req, res) => {
	// console.log(req.session.name);
	clientList = await appUserCollection.find({companyName: null, userType: 'client'}).project({email: 1, firstName: 1, lastName: 1}).toArray();
	// console.log(clientList.length);
	res.render('clientList', {clientArray: clientList, loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
});

app.get('/clientProfile/:id', async (req, res) => {

	// Get a list of all clients
	const clients = await appUserCollection.find({userType: 'client'}).project({id: 1, email: 1, firstName: 1, lastName: 1, phone: 1}).toArray();

	// Map their id's to a string
	const ids = clients.map(item => item._id.toString());

	// variable to store the client
	let targetClient;

	// loop through clients and find the target client to load the page with
	for (let i = 0; i < clients.length; i++) {
		if (ids[i] === req.params.id) {
			targetClient = clients[i];
		}
	}

	// used for locating the pfpUrl directory
	const email = targetClient.email;

	// // parse the email to be a dbname
	// const emailParsed = targetClient.email.split('.').join('');
	// const dbName = mongodb_clientdb + '-' + emailParsed;

	setClientDatabase(req, email);
	const clientdb = await getdb(req.session.clientdb);

	// set the databases
	const clientdbInfo = clientdb.collection('info');
	const clientdbDogs = clientdb.collection('dogs');

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
	// console.log(dogs);

	res.render('viewingClientProfile', {targetClient: targetClient, pfpUrl: pfpUrl, dogs: dogs, loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
});

app.use(express.static(__dirname + "/public"));

app.get('*', (req, res) => {
	res.status(404);
	res.render('errorMessage', { error: 'Page not found - 404', loggedIn: isValidSession(req), userType: req.session.userType, unreadAlerts: req.session.unreadAlerts});
})

app.listen(port, () => {
	console.log("Node application listening on port " + port);
});
