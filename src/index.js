'use strict';

const AWS = require('aws-sdk');
const DocumentDB = new AWS.DynamoDB.DocumentClient();
const slack = require('serverless-slack');
const DynamoDBService = require('./services/dynamodb');

const HPService = new DynamoDBService(DocumentDB, 'HP');

const ListHPCommand = require('./commands/listHP');

exports.handler = slack.handler.bind(slack);

new ListHPCommand(slack, HPService); // eslint-disable-line no-new
