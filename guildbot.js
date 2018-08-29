// Packages & helpers
const Discord = require('discord.js');
const Blizzard = require('./helpers/blizzard-api.js');
const dotenv = require('dotenv').config();
const mysql = require('mysql');
const AsciiTable = require('ascii-table');
const guildName = process.env.GUILD_NAME;

// Client instance
const client = new Discord.Client();

// raid constants
RAID_READY = 340;
RAID_OK = 335;

const isRaidReady = (itemLevel) => {
  if(itemLevel >= RAID_READY) {
    return 'Good';
  } else if(itemLevel < RAID_READY && itemLevel >= RAID_OK) {
    return 'OK';
  } else {
    return 'Low';
  }
}

// DB instance
const pool = mysql.createPool({
  connectionLimit : 10,
  host     : process.env.MYSQL_HOST,
  user     : process.env.MYSQL_USER,
  password : process.env.MYSQL_PASSWORD,
  database : process.env.GUILD_DB
});

//  Start up
client.on('ready', async () => {
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
    await pool.query(stmt);
  } catch(err) {
    console.log(err);
    return;
  }

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
        try {
          const { name, className, spec, role, ilvl } = await Blizzard.getCharacterSpec(args[0], args[1]);
          const stmt = `
            INSERT INTO members (name, class, spec, role, ilvl)
            VALUES ('${name}', '${className}', '${spec}', '${role}', '${ilvl}')`;
          pool.query(stmt, (error) => {
            if(error) {
              console.log(error);
              return;
            }
            message.channel.send('```' + `Added ${name} (${ilvl} ${spec} ${className}, ${role})` + '```');
          });
        } catch(e) {
          console.log(e);
          return;
        }
        break;
      }

      case 'update': {
        try {
          const { name, className, spec, role, ilvl } = await Blizzard.getCharacterSpec(args[0], args[1]);
          const stmt = `
            UPDATE members
            SET spec='${spec}', role='${role}', ilvl='${ilvl}'
            WHERE name='${name}'`;
          pool.query(stmt, (error) => {
            if(error) {
              console.log(error);
              return;
            }
            message.channel.send('```' + `Updated ${name} (${ilvl} ${spec} ${className}, ${role})` + '```');
          });
        } catch(e) {
          console.log(e);
          return;
        }
        break;
      }

      case 'remove': {
        const name = args[0].charAt(0).toUpperCase() + args[0].slice(1);
        const stmt  = `
          DELETE FROM members
          WHERE name='${name}'`;
        pool.query(stmt, (error) => {
          if(error) {
            console.log(error);
            return;
          }
          message.channel.send('```' + `Removed ${name}` + '```');
        });
        break;
      }

      case 'roster': {
        const table = new AsciiTable(`${guildName} Raid Roster`);
        let stmt = `SELECT * FROM members ORDER BY role DESC, class ASC, name ASC`;
        table.setHeading('Name', 'Role', 'Spec', 'Class', 'ILvl', 'Raid Ready');
        pool.query(stmt, (error, rows) => {
          if (error) {
            console.log(error);
            return;
          }
          // Populate the table
          rows.forEach((row) => {
            table.addRow(row.name, row.role, row.spec, row.class, row.ilvl, isRaidReady(Number(row.ilvl)));
          });

          // Collect role counts
          stmt = `
            SELECT
              SUM(role LIKE 'TANK') AS count_tank,
              SUM(role LIKE 'HEALING') AS count_healing,
              SUM(role LIKE 'DPS') AS count_dps,
              AVG(ilvl) AS avg_ilvl
            FROM members`;
          pool.query(stmt, (error, result) => {
            if(error) {
              console.log(error);
              return;
            }
            const comp = `${result[0].count_tank} TANK(S), ${result[0].count_healing} HEALER(S), ${result[0].count_dps} DPS`;
            const avgIlvl = `AVERAGE ITEM LEVEL: ${result[0].avg_ilvl}`;
            message.channel.send('```' + table.toString() + '\n\n' + comp + '\n\n' + avgIlvl + '```');
          })
        });
        break;
      }

      case 'help': {
        message.channel.send('```' + 'Options:\n- $add [character] [realm]\n- $update [character] [realm]\n- $remove [character]\n- $roster' + '\n\nMade by Vael, bug him if I\'m broken!' + '```');
        break;
      }

      default:
        message.channel.send('```' +  `Unrecognized command. Try again or type ${prefix}help for more help. If you're still stuck, contact Vael.` + '```');
    }
  }
});

client.login(process.env.BOT_TOKEN);
