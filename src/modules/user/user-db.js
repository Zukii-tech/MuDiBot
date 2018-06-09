const sql = require('sqlite');
const config = require('../../args.js').getConfig()[1];

async function runGetQuery(query, args) {
  try {
    await sql.open(config.pathDatabase);
    var response = await sql.get(query, args);
    await sql.close();
  } catch (e) {
    console.error(e);
    return;
  }
  return response;
}

async function runAllQuery(query, args) {
  try {
    await sql.open(config.pathDatabase);
    var response = await sql.all(query, args);
    await sql.close();
  } catch (e) {
    console.error(e);
    return;
  }
  return response;
}

async function runUpdateQuery(query, serverId, userId, newValue) {
  try {
    await sql.open(config.pathDatabase);
    //Make sure table exists
    await sql.run('CREATE TABLE IF NOT EXISTS users (serverId TEXT, userId TEXT, xp INTEGER, warnings INTEGER, groups TEXT)');
    //If user don't exist, insert
    await sql.run(`INSERT OR IGNORE INTO users (serverId, userId, xp, warnings, groups) VALUES (?, ?, ?, ?, ?)`, [
     serverId, userId, 0, 0, config.groups[0].name
    ]);
    //Update user
    await sql.run(query, [newValue, serverId, userId]);
    await sql.close();
  } catch (e) {
    console.error(e);
  }
}

module.exports = {
  user: {
    exists: async function(serverId, userId) {
      var query = 'SELECT 1 FROM users WHERE serverId = ? AND userId = ? LIMIT 1';
      var response = await runGetQuery(query, [serverId, userId]);
      return response != undefined;
    },
    getAll: async function(serverId, userId) {
      var query = 'SELECT * FROM users WHERE serverId = ? AND userId = ?';
      var user = await runGetQuery(query, [serverId, userId]);
      return user;
    },
    getPermGroups: async function(serverId, userId) {
      var query = 'SELECT groups FROM users WHERE serverId = ? AND userId = ?';
      var response = await runGetQuery(query, [serverId, userId]);
      //Add default group
      if (response == null || response.groups == null) {
        response.groups = config.groups[0].name;
        //Update db
        await this.updatePermGroups(serverId, userId, response.groups);
      }
      return response.groups;
    },
    getXp: async function(serverId, userId) {
      var query = 'SELECT xp FROM users WHERE serverId = ? AND userId = ?';
      var response = await runGetQuery(query, [serverId, userId]);
      if (response != undefined) {
        response = response.xp;
      }
      return response;
    },
    getWarnings: async function(serverId, userId) {
      var query = 'SELECT warnings FROM users WHERE serverId = ? AND userId = ?';
      var response = await runGetQuery(query, [serverId, userId]);
      if (response != undefined) {
        response = response.warnings;
      }
      return response;
    },
    updatePermGroups: async function(serverId, userId, groups) {
      //Update user's permission groups
      var query = 'UPDATE users SET groups = (?) WHERE serverId = ? AND userId = ?';
      await runUpdateQuery(query, serverId, userId, groups);
    },
    updateXP: async function(serverId, userId, newXP) {
      //Update user's xp
      var query = 'UPDATE users SET xp = ? WHERE serverId = ? AND userId = ?';
      await runUpdateQuery(query, serverId, userId, newXP);
    }
  },
  users: {
    getWarnings: async function(serverId) {
      var query = 'SELECT userId, warnings FROM users WHERE serverId = ?';
      return await runAllQuery(query, serverId);
    }
  }
}
