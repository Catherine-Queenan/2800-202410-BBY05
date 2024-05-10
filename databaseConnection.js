require('dotenv').config();

//Database information pulled from .env file
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;

//Creating a MongoClient and using it to connect to a specified database
const MongoClient = require("mongodb").MongoClient;
const atlasURI = `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_database}?retryWrites=true`;
var database = new MongoClient(atlasURI);

//Exports the database when this file is required in other files
module.exports = {database};