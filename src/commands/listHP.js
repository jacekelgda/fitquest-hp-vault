class ListHPCommand {
  constructor (slack, HPService) {
    this.slack = slack;
    this.HPService = HPService;

    this.init();
  }

  init () {
    this.slack.on('/listhp', (msg, bot) => {
      try {
        const message = 'test from app';

        bot.replyPrivate(message);
      } catch (error) {
        bot.replyPrivate('Whoops! An Error occured!');
      }
    });
  }
}

module.exports = ListHPCommand;
