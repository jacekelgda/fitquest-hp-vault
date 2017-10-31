'use strict';

const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

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
      body: JSON.stringify(result),
    };

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
    },
    UpdateExpression: 'SET hp = hp - :value, updatedAt = :updatedAt',
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
      body: JSON.stringify(result),
    };

    callback(null, response);
  });
}
