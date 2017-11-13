'use strict';

const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const { getChannelMembers } = require('../services/slack');
const params = {
  TableName: process.env.HP_TABLE_NAME,
};

module.exports.list = async (event, context, callback) => {
  const channelMembers = await getChannelMembers(process.env.MAIN_SLACK_CHANNEL);
  let members = [];
  dynamoDb.scan(params, (error, result) => {
    if (error) {
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t fetch the todos.',
      });
      return;
    }

    for (let i = 0; i < result.Items.length; i += 1) {
      if (channelMembers.includes(result.Items[i].slackid)) {
        members.push(result.Items[i]);
      }
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify(members),
    };

    callback(null, response);
  });
};
