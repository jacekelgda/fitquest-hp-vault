'use strict';

const Slack = require('slack-node');
const AWS = require('aws-sdk');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const getUserInfo = id => {
  const slack = new Slack(process.env.SLACK_API_TOKEN);

  return new Promise((resolve, reject) => {
    slack.api('users.info', {
      user: id,
    }, (err, response) => {
      resolve(response);
    });
  });
}

const notifyUser = (messageLink, attachments) => {
  const slack = new Slack(process.env.SLACK_API_TOKEN);

  slack.api('chat.postMessage', {
    text: messageLink,
    channel: process.env.LOGS_SLACK_GROUP,
    attachments
  }, (err, response) => {
    console.log(err, response);
  });
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

  const userInfo = await getUserInfo(data.userId);
  const messageLink = `${userInfo.user.name} has submitted challenge as done: https://x-team.slack.com/archives/${process.env.MAIN_SLACK_CHANNEL}/p${ts}`;
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

  console.log(messageLink);
  await notifyUser(`<@${process.env.GAME_MASTER_ID}>: ${messageLink}`, JSON.stringify(attachments));
  await notifyUser(`<@${process.env.ADMIN_ID}>: ${messageLink}`);
  const response = {
    statusCode: 201,
    body: 'Congrats. Your request is valid. It will be decided if The Guardians will approve it.',
  };

  callback(null, response);
}

module.exports.heal = async (event, context, callback) => {
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
      ':maxhp': 5
    },
    UpdateExpression: 'SET hp = hp + :value, updatedAt = :updatedAt',
    ConditionExpression: 'hp < :maxhp',
    ReturnValues: 'ALL_NEW',
  };

  const slack = new Slack(process.env.SLACK_API_TOKEN);
  const userInfo = await getUserInfo(data.callback_id);

  dynamoDb.update(params, (error, result) => {
    if (error) {
      console.log('HEAL', error);
      let errorBody = 'Error updating HP.'

      if (error.code === 'ConditionalCheckFailedException') {
        errorBody = `${userInfo.user.name} has reached 5HP limit. Request declined.`
      }
      callback(null, {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: errorBody,
      });
      return;
    }
    const response = {
      statusCode: 200,
      body: JSON.stringify(`Done! ${result.Attributes.userName} has now ${result.Attributes.hp}HP.`),
    };

    console.log('HEAL OK: ', result);
    callback(null, response);
  });

  await notifyUser(`<@${process.env.ADMIN_ID}>: The Device healing ${userInfo.user.name}`);
}

const fetchChannelUsers = () => {
  const slack = new Slack(process.env.SLACK_API_TOKEN);

  return new Promise((resolve, reject) => {
    const data = {
      channel: process.env.MAIN_SLACK_CHANNEL
    };

    slack.api('channels.info', data, (err, response) => {
      if (response.ok === false) {
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
