const Discord = require("discord.js");

exports.msg1 = {
  content: '$help',
  author: {
    username: 'TestUser',
    id: '041025599435591424'
  },
  guild: {
    id: '357156661105365963'
  },
  reply: function(text) {
    return text;
  },
  channel: {
    send: function(text) {
      return text;
    }
  },
  mentions: {
    users: new Discord.Collection
  }
}
