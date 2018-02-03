// Packages & helpers
const Discord = require('discord.js');
const Blizzard = require('./helpers/blizzard-api.js');
const dotenv = require('dotenv').config();
const mysql = require('mysql');
const AsciiTable = require('ascii-table');

// Client instance
const client = new Discord.Client();

// DB instance
const connection = mysql.createConnection({
  host     : process.env.MYSQL_HOST,
  user     : process.env.MYSQL_USER,
  password : process.env.MYSQL_PASSWORD,
  database : 'guild_db'
});

//  Start up
client.on('ready', async () => {
  // Connect to DB
  try {
    await connection.connect();
    console.log('Connected to mysql');
  } catch(err) {
    console.log(err);
  }

  // Create roster table
  const stmt = `
    CREATE TABLE IF NOT EXISTS members (
      name VARCHAR(255),
      class VARCHAR(255),
      spec VARCHAR(255),
      role VARCHAR(255),
      ilvl INT(3)
    )`;
  try {
    await connection.query(stmt);
  } catch(err) {
    console.log(err);
  }

  connection.end();
  // Done initializing
  console.log('Guildbot initialized');
});

// Event handler for user interaction
const prefix = '$';
client.on('message', async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  if(message.content.startsWith(prefix)) {
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    switch(command) {
      case 'add': {
        const { name, className, spec, role, ilvl } = await Blizzard.getCharacterSpec(args[0], args[1]);
        const stmt = `
          INSERT INTO members (name, class, spec, role, ilvl)
          VALUES ('${name}', '${className}', '${spec}', '${role}', '${ilvl}')`;
        connection.connect();
        connection.query(stmt, (error) => {
          if(error) return;
          message.channel.send('```' + `Added ${name} (${ilvl} ${spec} ${className}, ${role})` + '```');
        });
        connection.end();
        break;
      }

      case 'update': {
        const { name, className, spec, role, ilvl } = await Blizzard.getCharacterSpec(args[0], args[1]);
        const stmt = `
          UPDATE members
          SET spec='${spec}', role='${role}', ilvl='${ilvl}'
          WHERE name='${name}'`;
        connection.connect();
        connection.query(stmt, (error) => {
          if(error) return;
          message.channel.send('```' + `Updated ${name} (${ilvl} ${spec} ${className}, ${role})` + '```');
        });
        connection.end();
        break;
      }

      case 'remove': {
        const name = args[0].charAt(0).toUpperCase() + args[0].slice(1);
        const stmt  = `
          DELETE FROM members
          WHERE name='${name}'`;
        connection.connect();
        connection.query(stmt, (error) => {
          if(error) return;
          message.channel.send('```' + `Removed ${name}` + '```');
        });
        connection.end();
        break;
      }

      case 'roster': {
        const table = new AsciiTable('Fallout Raid Roster');
        let stmt = `SELECT * FROM members ORDER BY role DESC, class ASC, name ASC`;
        table.setHeading('Name', 'Role', 'Spec', 'Class', 'ILvl');
        connection.connect();
        connection.query(stmt, (error, rows) => {
          if (error) return;
          // Populate the table
          rows.forEach((row) => {
            table.addRow(row.name, row.role, row.spec, row.class, row.ilvl);
          });

          // Collect role counts
          stmt = `
            SELECT
              SUM(role LIKE 'TANK') AS count_tank,
              SUM(role LIKE 'HEALING') AS count_healing,
              SUM(role LIKE 'DPS') AS count_dps,
              AVG(ilvl) AS avg_ilvl
            FROM members`;
          connection.query(stmt, (error, result) => {
            if(error) return;
            const comp = `${result[0].count_tank} TANK(S), ${result[0].count_healing} HEALER(S), ${result[0].count_dps} DPS`;
            const avgIlvl = `AVERAGE ITEM LEVEL: ${result[0].avg_ilvl}`;
            message.channel.send('```' + table.toString() + '\n\n' + comp + '\n\n' + avgIlvl + '```');
          })
        });
        connection.end();
        break;
      }

      case 'help': {
        message.channel.send('```' + 'Options:\n- $add [character] [realm]\n- $update [character] [realm]\n- $remove [character]\n- $roster' + '```');
        break;
      }

      default:
        message.channel.send('```' +  `Unrecognized command. Try again or type ${prefix}help for more help. If you're still stuck, contact Vael.` + '```');
    }
  }
});

client.login(process.env.BOT_TOKEN);
