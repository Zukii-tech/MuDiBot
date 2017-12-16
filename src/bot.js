//Main class
const Discord = require("discord.js");
const client = new Discord.Client();
const warnings = require('./warnings.js');
const player = require('./audio-player.js');
const levels = require('./levels.js');
const defaultChannel = require('./default-channel.js');
const permGroup = require('./permission-group.js');
const fs = require('fs');
const mustache = require('mustache');
var config = require('./args.js').getConfig();
//For localization
var lang;

//Log to the discord user  with the token
var startTime;
client.login(config.botToken).then(startTime = Date.now());

//Start the bot
client.on('ready', () => {
  //Set language
  lang = require('./localization.js').getLocalization();
  console.log(mustache.render(lang.general.logged, client));
  console.log(lang.general.language);
  //Set status
  client.user.setGame(config.currentStatus);
  //Display startup time
  var time = Date.now() - startTime; +
  console.log(mustache.render(lang.general.startupTime, {
    time
  }));
});

module.exports.printMsg = function(msg, text) {
  printMsg(msg, text);
}

function printMsg(msg, text) {
  console.log(text);
  msg.channel.send(text);
}

/*
 *Use an object containing command objects to get
 *the permission needed and execute the command
 */
var commands = {
  help: {
    //Display a list of commands and their usage
    permLvl: 0,
    category: "General",
    execute: function(msg) {
      const help = require('./help.js');
      let args = msg.content.split(" ").slice(1);

      if (args[0] != undefined) {
        //Check if args is a valid command
        if (args[0] in commands) {
          //Valid command
          help.printCmd(msg, commands);
        } else {
          printMsg(msg, lang.error.invalidArg.cmd);
        }
      } else {
        //Print all commands
        help.printCmds(msg, Object.entries(commands));
      }
    }
  },

  ping: {
    //Reply "Pong!"
    permLvl: 0,
    category: "General",
    execute: function(msg) {
      msg.reply(lang.ping.pong);
      console.log(lang.ping.pong);
    }
  },

  info: {
    //Display info about the client
    permLvl: 0,
    category: "General",
    execute: function(msg) {
      var pjson = require('../package.json');
      var info = lang.info;

      var embed = new Discord.RichEmbed();
      embed.title = `__**${info.title}**__`;
      embed.color = 0x0080c0;
      embed.addField(name = `**${info.general.title}**`, value = `
        **${info.general.name}:** ${pjson.name}
        **${info.general.desc}:** ${pjson.description}
        **${info.general.author}:** ${pjson.author}
        **${info.general.version}:** ${pjson.version}
        **${info.general.uptime}:** ${time()}`.replace(/^( *)/gm, ''), inline = false)
      embed.addField(name = `**${info.config.title}**`, value = `
        **${info.config.language}:** ${config.locale}
        **${info.config.roleMember}:** ${config.roleMember}
        **${info.config.roleModo}:** ${config.roleModo}`.replace(/^( *)/gm, ''), inline = false)
      embed.setFooter(text = `${info.footer.clientId}: ${client.user.id}`)

      msg.channel.send({
        embed
      });
    }
  },

  status: {
    permLvl: 3,
    category: "General",
    execute: function(msg) {
      var newStatus = msg.content.split(`${config.prefix}status `).slice(1);
      client.user.setGame(newStatus[0]);

      modifyText('./config.js', 'status: \'' + config.currentStatus, 'status: \'' + newStatus[0]);
      config.currentStatus = newStatus[0];
    }
  },

  say: {
    permLvl: 3,
    category: "General",
    execute: function(msg) {
      let messageToSay = msg.content.split(' ').slice(1);
      let channel;

      //Try to find which channel to send message
      if (messageToSay[0] == 'here') {
        channel = msg.channel;
      } else {
        let id = messageToSay[0].match(/<#(.*?)>/);
        if (id != undefined) {
          channel = client.channels.get(id[1]);
        }
      }

      messageToSay = messageToSay.slice(1).join(' ');

      //Check arguments
      if (channel == undefined) {
        channel = msg.channel;
        messageToSay = lang.error.missingArg.channel;
      }

      if (messageToSay == undefined || messageToSay == '') {
        messageToSay = lang.error.missingArg.message;
      }

      //Send message
      channel.send(messageToSay);
    }
  },

  avatar: {
    permLvl: 0,
    category: "User",
    execute: function(msg) {
      var user = msg.mentions.users.first()
      if (user != undefined && user != null) {
        printMsg(msg, user.avatarURL);
      } else {
        printMsg(msg, lang.error.invalidArg.user);
      }
    }
  },

  profile: {
    permLvl: 0,
    category: "User",
    execute: async function(msg) {
      const storage = require('./storage.js');
      let user = msg.mentions.users.first();
      if (user == undefined) {
        //There is no mentions
        user = msg.author;
      }

      let userData = await storage.getUser(msg, user.id);
      let progression = levels.getProgression(userData.xp);
      let level = progression[0];
      let xpToNextLevel = `${progression[1]}/${levels.getXpForLevel(level)}`;
      let rank = levels.getRank(progression[2]);
      let groups = userData.groups.split(',').sort(function(a, b) {
        return config.groups.find(x => x.name == a).permLvl <
          config.groups.find(x => x.name == b).permLvl;
      });

      //If user is a superuser, add that to groups
      if(config.superusers.find(x => x == msg.author.id) != null) {
        groups.unshift('Superuser')
      }

      //Put newline at every 4 groups
      for(let i = 3; i < groups.length; i += 3) {
        groups[i] = '\n' + groups[i];
      }

      var embed = new Discord.RichEmbed();
      embed.title = mustache.render(lang.profile.title, user);
      embed.color = rank[2];
      embed.setThumbnail(url = user.avatarURL)
      embed.addField(name = lang.profile.rank,
        value = `${rank[0]} ${(rank[1] > 0) ? `(${rank[1]}:star:)` : ''}`,
        inline = true)
      embed.addField(name = lang.profile.groups, value = groups.join(', '), inline = true)
      embed.addField(name = lang.profile.level, value = `${level} (${xpToNextLevel})`, inline = false)
      embed.addField(name = lang.profile.xp, value = userData.xp, inline = true)
      embed.addField(name = lang.profile.warnings, value = userData.warnings, inline = true)
      embed.setFooter(text = mustache.render(lang.profile.footer, user))
      msg.channel.send({
        embed
      });
    }
  },

  setgroup: {
    permLvl: 3,
    category: "User",
    execute: function(msg) {
      var args = msg.content.split(" ").slice(1);
      permGroup.setGroup(msg, args);
    }
  },

  unsetgroup: {
    permLvl: 3,
    category: "User",
    execute: function(msg) {
      var args = msg.content.split(" ").slice(1);
      permGroup.unsetGroup(msg, args);
    }
  },
  get ungroup () {
    var cmd = Object.assign({}, this.unsetgroup);
    cmd.aliasOf = 'unsetgroup';
    return cmd;
  },

  purgegroups: {
    permLvl: 3,
    category: "User",
    execute: function(msg) {
      permGroup.purgeGroups(msg);
    }
  },
  get gpurge () {
    var cmd = Object.assign({}, this.purgegroups);
    cmd.aliasOf = 'purgegroups';
    return cmd;
  },

  gif: {
    permLvl: "roleMember",
    category: "Fun",
    execute: async function(msg) {
      const giphy = require('./giphy-api.js');
      let args = msg.content.split(" ").slice(1);

      var url = await giphy.search(args);
      if (url != undefined) {
        msg.channel.send(url);
      }
    }
  },

  gifrandom: {
    permLvl: "roleMember",
    category: "Fun",
    execute: async function(msg) {
      const giphy = require('./giphy-api.js');
      let args = msg.content.split(" ").slice(1);

      var url = await giphy.random(args);
      if (url != undefined) {
        msg.channel.send(url);
      }
    }
  },
  get gifr () {
    var cmd = Object.assign({}, this.gifrandom);
    cmd.aliasOf = 'gifrandom';
    return cmd;
  },

  flipcoin: {
    permLvl: 0,
    category: "Fun",
    execute: function(msg) {
      msg.reply(Math.floor(Math.random() * 2) == 0 ? lang.flipcoin.heads : lang.flipcoin.tails);
    }
  },

  roll: {
    permLvl: 0,
    category: "Fun",
    execute: function(msg) {
      args = msg.content.split(/[ d+]|(?=-)/g).slice(1);
      num = isNaN(args[2]) ? 0 : parseInt(args[2]);
      for (i = 0; i < args[0]; i++) {
        num += Math.floor(Math.random() * args[1]) + 1;
      }
      msg.reply(num);
    }
  },

  custcmd: {
    permLvl: "roleMember",
    category: "Fun",
    execute: function(msg) {
      const customCmd = require('./custom-cmd.js');
      var args = msg.content.split(" ").slice(1);
      customCmd.addCmd(msg, args);
    }
  },
  get cc () {
    var cmd = Object.assign({}, this.custcmd);
    cmd.aliasOf = 'custcmd';
    return cmd;
  },

  custcmdlist: {
    permLvl: "roleMember",
    category: "Fun",
    execute: function(msg) {
      const customCmd = require('./custom-cmd.js');
      var args = msg.content.split(" ").slice(1);
      customCmd.printCmds(msg, args);
    }
  },
  get cclist () {
    var cmd = Object.assign({}, this.custcmdlist);
    cmd.aliasOf = 'custcmdlist';
    return cmd;
  },

  custcmdremove: {
    permLvl: 3,
    category: "Fun",
    execute: function(msg) {
      const customCmd = require('./custom-cmd.js');
      var args = msg.content.split(" ").slice(1);
      customCmd.removeCmd(msg, args);
    }
  },
  get ccrem () {
    var cmd = Object.assign({}, this.custcmdremove);
    cmd.aliasOf = 'custcmdremove';
    return cmd;
  },

  play: {
    //Play a song on YouTube
    permLvl: 0,
    category: "Music",
    execute: function(msg) {
      player.playYoutube(msg, msg.content.split(" ").slice(1));
    }
  },

  stop: {
    //Stop the voice connection and leave voice channel
    permLvl: 0,
    category: "Music",
    execute: function(msg) {
      player.stop(msg);
    }
  },

  skip: {
    //Skip to next song in queue
    permLvl: "roleMember",
    category: "Music",
    execute: function(msg) {
      player.skip(msg);
    }
  },

  queue: {
    //Skip to next song in queue
    permLvl: 0,
    category: "Music",
    execute: function(msg) {
      player.listQueue(msg);
    }
  },

  warn: {
    permLvl: 2,
    category: "Warnings",
    execute: function(msg) {
      warnings.warn(msg, 1);
    }
  },

  unwarn: {
    permLvl: 2,
    category: "Warnings",
    execute: function(msg) {
      warnings.warn(msg, -1);
    }
  },

  warnlist: {
    permLvl: 2,
    category: "Warnings",
    execute: function(msg) {
      warnings.list(msg);
    }
  },

  warnpurge: {
    //Handle warnings
    permLvl: 2,
    category: "Warnings",
    execute: function(msg) {
      warnings.purge(msg);
    }
  },

  clearlog: {
    //Clear listed commands
    permLvl: 3,
    category: "Administration",
    execute: function(msg) {
      //Split the message to get only the argument
      let args = msg.content.split(" ").slice(1);
      let numToDel = args[0];

      //In case the argument isn't a valid number
      if (numToDel === null || isNaN(numToDel)) {
        numToDel = '50';
      }
      clear(msg, numToDel);
    }
  },

  kill: {
    //Kill the process
    permLvl: 3,
    category: "Administration",
    execute: function(msg) {
      console.log(lang.general.stopping);
      process.exitCode = 0;
      process.exit();
    }
  },

  restart: {
    //Restart the client
    permLvl: 3,
    category: "Administration",
    execute: function() {
      //Spawn new process
      var spawn = require('child_process').spawn;

      var child = spawn('node', ['./src/bot.js'], {
        detached: true,
        shell: true,
        stdio: 'ignore'
      });
      child.unref();

      console.log(lang.general.restarting);

      //Exit this process
      process.exitCode = 0;
      process.exit();
    }
  },

  setchannel: {
    permLvl: 3,
    category: "Administration",
    execute: function(msg) {
      var botChannel = msg.channel;
      //Modify default channel in database
      defaultChannel.setChannel(msg, botChannel);
      botChannel.send(lang.setchannel.newDefaultChannel);
    }
  },

  setreward: {
    permLvl: 3,
    category: "Administration",
    execute: function(msg) {
      levels.setReward(msg, msg.content.split(" ").slice(1));
    }
  },

  unsetreward: {
    permLvl: 3,
    category: "Administration",
    execute: function(msg) {
      levels.unsetReward(msg, msg.content.split(" ").slice(1));
    }
  }
}

var keys = Object.keys(commands);

/*
 *Function fired when a message is posted
 *to check if the message is calling a command
 */
client.on('message', msg => {
  //Ignore bot
  if (msg.author.bot) return;

  //Check if the author is not the bot
  if (msg.author != client.user) {
    let cmd = msg.content.slice(config.prefix.length);
    if(cmd != undefined) {
      cmd = cmd.split(' ');
    }

    var cmdActivated = config[cmd[0]] != undefined ? config[cmd[0]].activated : true;

    //Check if message begins with prefix, if cmd is a valid command and is it's activated
    if (msg.content.indexOf(config.prefix) == 0 && cmd[0] in commands && cmdActivated) {
      console.log(msg.author.username + ' - ' + msg.content);

      //Check if user has permission
      checkPerm(msg, commands[cmd[0]].permLvl).then(result => {
        if(result) commands[cmd[0]].execute(msg);
      });
    } else {
      const customCmd = require('./custom-cmd.js');

      customCmd.getCmds(msg).then(custCmds => {
        var cmd = custCmds.find(x => x.name == msg.content);
        if (cmd != undefined) {
          switch (cmd.action) {
            case 'say':
              msg.channel.send(cmd.arg);
              break;
            case 'play':
              player.playYoutube(msg, cmd.arg);
              break;
            default:
              console.log(lang.error.invalidArg.cmd);
          }
        }
      });
    }
    if (config.levels.activated == true) {
      //Add xp
      levels.newMessage(msg);
    }
  }
});

//Format time
function time() {
  var time = process.uptime();
  var days = ~~(time / 86400)
  var hrs = ~~((time % 86400) / 3600);
  var mins = ~~((time % 3600) / 60);
  var secs = ~~(time % 60);
  return days + 'd:' + hrs + 'h:' + mins + 'm:' + secs + 's'
}

function modifyText(file, text, value) {
  fs.readFile(file, 'utf8', function(err, data) {
    if (err) {
      return console.log(err);
    }
    var result = data.replace(text, value);

    fs.writeFile(file, result, 'utf8', function(err) {
      if (err) return console.log(err);
    });
  });
}

//Function that fetch, check and delete messages
function clear(msg, num) {
  var clearList = config.clearlog.commandsToClear.concat(config.clearlog.usersToClear);
  for (i = 0; i < keys.length; i++) {
    clearList.push(config.prefix + keys[i]);
  }

  //Fetch
  msg.channel.fetchMessages({
      limit: parseInt(num)
    })
    .then(messages => {
      console.log(lang.clearlog.maxNum + num);
      var msg = messages.array();
      var deletedMessages = 0;

      //Check messages
      for (var i = 0; i < messages.array().length; i++) {
        //Delete commands from bot
        if (msg[i].author.id === client.user.id) {
          msg[i].delete()
          deletedMessages++;
        } else {
          //Find and delete
          for (var n = 0; n < clearList.length; n++) {
            if (msg[i].content.substring(0, clearList[n].length) === clearList[n] || msg[i].author.id === clearList[n]) {
              msg[i].delete()
              deletedMessages++;
              break
            }
          }
        }
      }
      console.log(mustache.render(lang.clearlog.deleted, {
        deletedMessages
      }));
    })
    .catch(console.error);
}

//Convert roles into mention objects
function mention(roles, role) {
  if (role === 'everyone') {
    return '@everyone';
  } else if (role === "roleMember") {
    return roles.find("name", config.roleMember);
  } else if (role === "roleModo") {
    return roles.find("name", config.roleModo);
  } else {
    return null;
  }
}
/*
 *Check if the message author has permission
 *to do the command, return true or false
 */
async function checkPerm(msg, permLevel) {
  //Exceptions
  //Check if user is superuser
  for (i = 0; i < config.superusers.length; i++) {
    if (msg.author.id === config.superusers[i]) {
      return true;
    }
  }

  //Check if user is an administrator
  var permissions = msg.member.permissions;
  if (permissions.has('ADMINISTRATOR')) {
    return true;
  }

  const storage = require('./storage.js');
  let user = await storage.getUser(msg, msg.author.id);

  var userGroup = user.groups.split(',').sort(function(a, b) {
    return config.groups.find(x => x.name == a).permLvl <
      config.groups.find(x => x.name == b).permLvl;
  })[0];
  var userPermLevel = config.groups.find(x => x.name == userGroup).permLvl;

  //Compare user and needed permission level
  console.log([userPermLevel, permLevel]);
  if (userPermLevel >= permLevel) {
    return true;
  }
  printMsg(msg, lang.error.notEnoughPermissions);
  return false;
}

async function sendDefaultChannel(member, text) {
  let channel = await defaultChannel.getChannel(client, member);
  channel.send(text);
}

//When users join the server
client.on('guildMemberAdd', member => {
  if (config.greeting.activated == true) {
    sendDefaultChannel(member, mustache.render(lang.general.member.joined, {
      member
    }));
  }
});

//When users leave the server
client.on('guildMemberRemove', member => {
  if (config.farewell.activated == true) {
    sendDefaultChannel(member, mustache.render(lang.general.member.left, {
      member
    }));
  }
});

//Make sure the process exits correctly and don't fails to close
process.on('SIGINT', function() {
  process.exit(2);
});
