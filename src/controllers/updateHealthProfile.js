'use strict';

const AWS = require('aws-sdk');
const Slack = require('slack-node');
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const getChannelMembers = (id) => {
  const slack = new Slack(process.env.SLACK_API_TOKEN);

  return new Promise((resolve, reject) => {
    slack.api('channels.info', {
      channel: id
    }, (err, response) => {
      if (err) {
          reject(err);
      } else if (response.ok === false) {
          reject(response.error);
      } else if (response.ok === true) {
          resolve(response.channel.members);
      }
    });
  });
}

const notifyUser = (id, messageLink, attachments) => {
  const slack = new Slack(process.env.SLACK_API_TOKEN);

  return new Promise((resolve, reject) => {
    slack.api('chat.postMessage', {
      text: messageLink,
      channel: `@${id}`,
      attachments
    }, (err, response) => {
      if (err) {
          reject(err);
      } else if (response.ok === false) {
          reject(response.error);
      } else if (response.ok === true) {
          resolve(response.members);
      }
    });
  });
}

const sendAsThePlanet = (id, text, attachments) => {
  const slack = new Slack(process.env.SLACK_BOT_TOKEN);

  return new Promise((resolve, reject) => {
    slack.api('chat.postMessage', {
      text,
      channel: `@${id}`,
      attachments,
      as_user: true
    }, (err, response) => {
      if (err) {
          reject(err);
      } else if (response.ok === false) {
          reject(response.error);
      } else if (response.ok === true) {
          resolve(response.members);
      }
    });
  });
}

module.exports.update = (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);

  if (typeof data.hp !== 'number') {
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Couldn\'t update hp profile.',
    });
    return;
  }

  const params = {
    TableName: process.env.HP_TABLE_NAME,
    Key: {
      id: event.pathParameters.id,
    },
    ExpressionAttributeValues: {
      ':hp': data.hp,
      ':updatedAt': timestamp,
    },
    UpdateExpression: 'SET hp = :hp, updatedAt = :updatedAt',
    ReturnValues: 'ALL_NEW',
  };

  dynamoDb.update(params, (error, result) => {
    if (error) {
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t fetch the hp profile.',
      });
      return;
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify(result.Attributes),
    };

    callback(null, response);
  });
};

module.exports.healcmd = (event, context, callback) => {
  const data = JSON.parse(event.body);
  const timestamp = new Date().getTime();
  const params = {
    TableName: process.env.HP_TABLE_NAME,
    Key: {
      id: data.userId,
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

  dynamoDb.update(params, (error, result) => {
    if (error) {
      console.log('HEALCMD', error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: error.code || 'Couldn\'t update the hp profile.',
      });
      return;
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify(result),
    };

    console.log('HEALCMD OK: ', result);

    callback(null, response);
  });
}

module.exports.hitcmd = (event, context, callback) => {
  const data = JSON.parse(event.body);
  const timestamp = new Date().getTime();
  const params = {
    TableName: process.env.HP_TABLE_NAME,
    Key: {
      id: data.userId,
    },
    ExpressionAttributeValues: {
      ':value': 1,
      ':updatedAt': timestamp,
      ':minhp': 0
    },
    UpdateExpression: 'SET hp = hp - :value, updatedAt = :updatedAt',
    ConditionExpression: 'hp > :minhp',
    ReturnValues: 'ALL_NEW',
  };

  dynamoDb.update(params, (error, result) => {
    if (error) {
      console.log('HITCMD', error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: error.code || 'Couldn\'t update the hp profile.',
      });
      return;
    }

    const response = {
      statusCode: 200,
      body: JSON.stringify(result),
    };

    console.log('HITCMD OK: ', result);

    callback(null, response);
  });
}

const getAllItems = () => {
  const scanParams = {
    TableName: process.env.HP_TABLE_NAME,
  };

  return new Promise((resolve, reject) => {
    dynamoDb.scan(scanParams, (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result.Items);
    });
  });
}

module.exports.theplanetcmd = async (event, context, callback) => {
  await notifyUser(process.env.ADMIN_ID, 'The Planet Harvest started ...');
  const data = JSON.parse(event.body);

  if (typeof data.token !== 'string' || data.token !== process.env.VERIFICATION_TOKEN) {
    callback(null, {
      statusCode: 403,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Auth exception.',
    });
    await notifyUser(process.env.ADMIN_ID, 'Auth exception.');
    return;
  }
  const timestamp = new Date().getTime();
  const allItems = await getAllItems();
  const gameChannelMembers = await getChannelMembers(process.env.MAIN_SLACK_CHANNEL);
  for (let i = 0; i < allItems.length; i += 1) {
    if (gameChannelMembers.includes(allItems[i].id)) {
      const params = {
        TableName: process.env.HP_TABLE_NAME,
        Key: {
          id: allItems[i].id,
        },
        ExpressionAttributeValues: {
          ':value': 2,
          ':updatedAt': timestamp,
          ':minhp': 0
        },
        UpdateExpression: 'SET hp = hp - :value, updatedAt = :updatedAt',
        ConditionExpression: 'hp >= :minhp',
        ReturnValues: 'ALL_NEW',
      };

      console.log(`${i}: ${allItems[i].hp}HP -2HP from ${allItems[i].userName}`);
      if (allItems[i].hp > 0) {
        console.log(`${allItems[i].userName} is still in game.`);
        dynamoDb.update(params, async (error, result) => {
          if (error) {
            console.log('THEPLANETCMD', error);
            let errorBody = error.code;
      
            if (error.code === 'ConditionalCheckFailedException') {
              errorBody = `${allItems[i].userName} has reached 0HP limit. Request declined.`;
            }
            await notifyUser(process.env.ADMIN_ID, errorBody);
            return;
          }
      
          if (result.Attributes.hp > 0) {
            await sendAsThePlanet(allItems[i].id, `The Planet deals -2HP damage. You now have ${result.Attributes.hp}HP`);
          } else {
            const attachments = [
                {
                    'text': `${allItems[i].userName} has died.`,
                    'fallback': 'FitQuest death',
                    'callback_id': 1,
                    'color': 'danger',
                    'attachment_type': 'default'
                }
            ];
      
            await notifyUser(process.env.GAME_MASTER_ID, null, JSON.stringify(attachments));
            await sendAsThePlanet(allItems[i].id, 'The Planet deals -2HP damage. You are now dead.');
            await notifyUser(process.env.ADMIN_ID, `${allItems[i].userName} has died.`);
          }
        });
      }
    }
  }

  const response = {
    statusCode: 201,
    body: 'Done!',
  };

  callback(null, response);
  notifyUser(process.env.ADMIN_ID, 'Done!');
}
