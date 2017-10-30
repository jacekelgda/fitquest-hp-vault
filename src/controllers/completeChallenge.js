'use strict';

const Slack = require('slack-node');
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const fetchChannelUsers = () => {
  const slack = new Slack(process.env.SLACK_API_TOKEN);

  return new Promise((resolve, reject) => {
    const data = {
      channel: process.env.MAIN_SLACK_CHANNEL
    };

    slack.api('channels.info', data, (err, response) => {
      if (err) {
        reject(err);
      } else if (response.ok === false) {
          reject(response.error);
      } else if (response.ok === true) {
          resolve(response.channel.members);
      }
    })
  })
}

const checkIfParticipant = async userId => {
  const channelUsers = await fetchChannelUsers();

  return channelUsers.includes(userId);
}

module.exports.complete = async (event, context, callback) => {
  const data = JSON.parse(event.body);
  const slack = new Slack(process.env.SLACK_API_TOKEN);
  const ts = data.ts;

  if (!data.userId) {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'We shal not pass this request. We need to know userId of posted message.',
    });
    return;
  }

  const isParticipant = await checkIfParticipant(data.userId);

  if (!isParticipant) {
    callback(null, {
      statusCode: 404,
      headers: { 'Content-Type': 'text/plain' },
      body: 'We shal not pass this request. Provided userId is not of participant.',
    });
    return;
  }

  if (!data.ts) {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'We shal not pass this request. We need to know ts of posted message.',
    });
    return;
  }

  const reg = /^.{10}\..{6}$/g;

  if (reg.test(data.ts)) {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'We shal not pass this request. Remove that annoying dot from the middle of the string.',
    });
    return;
  }

  const messageLink = `User has submitted challenge as done: https://x-team.slack.com/archives/${process.env.MAIN_SLACK_CHANNEL}/p${ts}`;

  const attachments = [
      {
          'text': 'Do you approve this request?',
          'fallback': 'choose your action',
          'callback_id': data.userId,
          'color': '#3AA3E3',
          'attachment_type': 'default',
          'actions': [
              {
                  'name': 'game',
                  'text': 'Approve',
                  'type': 'button',
                  'style': 'primary',
                  'value': '1'
              },
              {
                  'name': 'game',
                  'text': 'Decline',
                  'style': 'danger',
                  'type': 'button',
                  'value': '0',
                  'confirm': {
                      'title': 'Are you sure?',
                      'text': 'It will result with damage in the end of the week.',
                      'ok_text': 'Yes',
                      'dismiss_text': 'No'
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
  }, (err, response) => {
    if (err) {
      console.log(err);
    }
    console.log(response);
  });

  const response = {
    statusCode: 201,
    body: 'Congrats. Your request is valid. It will be decided if The Guardians will approve it.',
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

  dynamoDb.update(params, error => {
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
