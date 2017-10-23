'use strict';

const AWS = require('aws-sdk');
const DocumentDB = new AWS.DynamoDB.DocumentClient();
const DynamoDBService = require('./services/dynamodb');
const HPService = new DynamoDBService(DocumentDB, 'HP');
