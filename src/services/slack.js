const Slack = require('slack-node');

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

module.exports = {
  getChannelMembers
}
