//Handle warnings
const storage = require('../../storage.js');
const bot = require('../../bot.js');
const mustache = require('mustache');
const sql = require('sqlite');
const config = require('../../args.js').getConfig()[1];
var lang = require('../../localization.js').getLocalization();

module.exports = {
  WarnCommand: class extends bot.Command {
    constructor() {
      super({
        name: 'warn',
        aliases: [],
        category: 'warnings',
        permLvl: 2
      });
    }
    execute(msg, args) {
      module.exports.warn(msg, 1);
    }
  },
  UnwarnCommand: class extends bot.Command {
    constructor() {
      super({
        name: 'unwarn',
        aliases: [],
        category: 'warnings',
        permLvl: 2
      });
    }
    execute(msg, args) {
      module.exports.warn(msg, -1);
    }
  },
  WarnListCommand: class extends bot.Command {
    constructor() {
      super({
        name: 'warnlist',
        aliases: [],
        category: 'warnings',
        permLvl: 1
      });
    }
    async execute(msg, args) {
      if (args == 'all') {
        //List all users warnings
        var users = await storage.getUsers(msg);

        var output = '';
        for (i = 0; i < users.length; i++) {
          if (users[i].warnings > 0) {
            if (output.length > 0) {
              output += '\n';
            }
            output += mustache.render(lang.warn.list, users[i]);
          }
        }
        if (output === '') {
          output = lang.warn.noWarns;
        }
        bot.printMsg(msg, output);
      } else if (msg.mentions.users.first() != undefined) {
        //List the user's warnings
        var user = await storage.getUser(msg, msg.mentions.users.first().id);

        if (user != undefined) {
          bot.printMsg(msg, mustache.render(lang.warn.list, user));
        } else {
          bot.printMsg(msg, lang.error.invalidArg.user);
        }
      } else {
        bot.printMsg(msg, lang.error.usage);
      }
    }
  },
  WarnPurgeCommand: class extends bot.Command {
    constructor() {
      super({
        name: 'warnpurge',
        aliases: [],
        category: 'warnings',
        permLvl: 2
      });
    }
    async execute(msg, args) {
      if (args == 'all') {
        //Purge all users
        await modifyUsersWarnings(msg, 0)
        bot.printMsg(msg, lang.warn.usersCleared);
      } else if (msg.mentions.users.first() != undefined) {
        //Purge the user
        var user = await storage.getUser(msg, msg.mentions.users.first().id);

        if (user != undefined) {
          await modifyUserWarnings(msg, user.userId, 0)
          bot.printMsg(msg, lang.warn.userCleared);
        } else {
          bot.printMsg(msg, lang.error.invalidArg.user);
        }
      } else {
        bot.printMsg(msg, lang.error.usage);
      }
    }
  },
  warn: async function(msg, num) {
    if (msg.mentions.users.first() != undefined) {
      //There is a mention
      var user = await storage.getUser(msg, msg.mentions.users.first().id);
      var warnings = user.warnings
      if (warnings != undefined) {
        //User warnings found!
        warnings = warnings + num;
        await modifyUserWarnings(msg, user.userId, warnings);
        user.warnings = warnings;
        bot.printMsg(msg, mustache.render(lang.warn.list, user));
      } else {
        bot.printMsg(msg, lang.error.invalidArg.user);
      }
    } else {
      bot.printMsg(msg, lang.error.usage);
    }
  }
}

function modifyUsersWarnings(msg, value) {
  return new Promise(function(resolve) {
    sql.open(config.pathDatabase).then(() => {
      sql.run('CREATE TABLE IF NOT EXISTS users (serverId TEXT, userId TEXT, xp INTEGER, warnings INTEGER, groups TEXT)')
        .then(() => {
          sql.run('UPDATE users SET warnings = ? WHERE serverId = ?', [value, msg.guild.id]).then(() => {
            resolve();
          }).catch(error => {
            console.log(error);
            resolve();
          });
        }).catch(error => {
          console.log(error);
          resolve();
        });
      sql.close();
    }).catch(error => {
      console.log(error);
      resolve();
    });
  });
}

function modifyUserWarnings(msg, userId, value) {
  return new Promise(function(resolve) {
    sql.open(config.pathDatabase).then(() => {
      sql.run('CREATE TABLE IF NOT EXISTS users (serverId TEXT, userId TEXT, xp INTEGER, warnings INTEGER, groups TEXT)')
        .then(() => {
          sql.run('UPDATE users SET warnings = ? WHERE serverId = ? AND userId = ?', [value, msg.guild.id, userId]).then(() => {
            resolve();
          }).catch(error => {
            console.log(error);
            resolve();
          });
        }).catch(error => {
          console.log(error);
          resolve();
        });
      sql.close();
    }).catch(error => {
      console.log(error);
      resolve();
    });
  });
}
