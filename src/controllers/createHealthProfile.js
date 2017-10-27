'use strict';

const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.create = (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);

  if (typeof data.slackid !== 'string' || typeof data.username !== 'string') {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Couldn\'t create hp profile.',
    });
    return;
  }
  const params = {
    TableName: process.env.HP_TABLE_NAME,
    Item: {
      id: data.slackid,
      slackid: data.slackid,
      userName: data.slackusername,
      hp: 3,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  dynamoDb.put(params, error => {
    if (error) {
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t create the HP profile item.',
      });
      return;
    }

    const response = {
      statusCode: 201,
      body: JSON.stringify(params.Item),
    };

    callback(null, response);
  });
};
