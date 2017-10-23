'use strict';

const Slack = require('slack-node');
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.complete = (event, context, callback) => {
  const data = JSON.parse(event.body);
  const slack = new Slack(process.env.SLACK_API_TOKEN);
  const ts = data.ts;
  const messageLink = `User has submitted challenge as done: https://x-team.slack.com/archives/${process.env.MAIN_SLACK_CHANNEL}/p${ts}`;

  const attachments = [
      {
          "text": "Do you approve this request?",
          "fallback": "choose your action",
          "callback_id": data.userId,
          "color": "#3AA3E3",
          "attachment_type": "default",
          "actions": [
              {
                  "name": "game",
                  "text": "Approve",
                  "type": "button",
                  "style": "primary",
                  "value": "1"
              },
              {
                  "name": "game",
                  "text": "Decline",
                  "style": "danger",
                  "type": "button",
                  "value": "0",
                  "confirm": {
                      "title": "Are you sure?",
                      "text": "It will result with damage in the end of the week.",
                      "ok_text": "Yes",
                      "dismiss_text": "No"
                  }
              }
          ]
      }
  ];

  slack.api('chat.postEphemeral', {
    text: messageLink,
    channel: process.env.MAIN_SLACK_CHANNEL,
    user: process.env.GAME_MASTER_ID,
    attachments: JSON.stringify(attachments)
  }, function(err, response){
    console.log(response);
  });

  const response = {
    statusCode: 201,
    body: 'OK',
  };

  callback(null, response);
}

module.exports.heal = (event, context, callback) => {
  const data = JSON.parse(decodeURIComponent(event.body.replace(/^payload=/, '')));
  if (data.actions[0].value === '0') {
    const response = {
      statusCode: 200,
      body: JSON.stringify('HP was not changed.'),
    };

    callback(null, response);
    return;
  }
  const timestamp = new Date().getTime();
  const params = {
    TableName: process.env.HP_TABLE_NAME,
    Key: {
      id: data.callback_id,
    },
    ExpressionAttributeValues: {
      ':value': 1,
      ':updatedAt': timestamp,
    },
    UpdateExpression: 'SET hp = hp + :value, updatedAt = :updatedAt',
    ReturnValues: 'ALL_NEW',
  };

  dynamoDb.update(params, (error, result) => {
    if (error) {
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t update the hp profile.',
      });
      return;
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify('HP increased by +1HP'),
    };

    callback(null, response);
  });
}
