'use strict';

const Slack = require('slack-node');

module.exports.complete = (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);
  const slack = new Slack(process.env.SLACK_API_TOKEN);
  const ts = data.ts;
  const messageLink = `User has submitted challenge as done: https://x-team.slack.com/archives/${process.env.MAIN_SLACK_CHANNEL}/p${ts}`;
  const attachments = [
      {
          "text": "Do you approve this request?",
          "fallback": "choose your action",
          "callback_id": "wopr_game",
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
    body: 'ok',
  };

  callback(null, response);
}
