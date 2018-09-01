// Packages & helpers
const Discord = require('discord.js');
const Blizzard = require('./helpers/blizzard-api.js');
const dotenv = require('dotenv').config();
const mysql = require('mysql');
const guildName = process.env.GUILD_NAME;
const realm = process.env.REALM_NAME;
const wowArmoryUrl = 'https://worldofwarcraft.com/en-us/character';

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
      ilvl INT(3),
      PRIMARY KEY(name)
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
            REPLACE INTO members (name, class, spec, role, ilvl)
            VALUES ('${name}', '${className}', '${spec}', '${role}', '${ilvl}')`;
          pool.query(stmt, (error) => {
            if(error) {
              console.log(error);
              return;
            }
            const embed = new Discord.RichEmbed()
              .setColor(0x00Ae86)
              .setTimestamp()
              .setFooter('Type $help to view more commands. Beep Boop.')
              .setDescription(`Added [${name}](${wowArmoryUrl}/${realm}/${name}) (${ilvl} ${spec} ${className})`);
            message.channel.send({embed});
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
            const embed = new Discord.RichEmbed()
              .setColor(0x00Ae86)
              .setTimestamp()
              .setFooter('Type $help to view more commands. Beep Boop.')
              .setDescription(`Updated [${name}](${wowArmoryUrl}/${realm}/${name}) (${ilvl} ${spec} ${className})`);
            message.channel.send({embed});
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
          const embed = new Discord.RichEmbed()
            .setColor(0x00Ae86)
            .setTimestamp()
            .setFooter('Type $help to view more commands. Beep Boop.')
            .setDescription(`Removed ${name}`)
          message.channel.send({embed});
        });
        break;
      }

      case 'roster': {
        let stmt = `SELECT * FROM members ORDER BY role DESC, class ASC, name ASC`;
        pool.query(stmt, (error, rows) => {
          if (error) {
            console.log(error);
            return;
          }

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
            const comp = `${result[0].count_tank} tanks(s), ${result[0].count_healing} healer(s), ${result[0].count_dps} DPS`;
            const avgIlvl = `Average item level: **${result[0].avg_ilvl}**`;

            const embed = new Discord.RichEmbed()
              .setColor(0x00Ae86)
              .setTimestamp()
              .setFooter('Type $help to view more commands. Beep Boop.');

            if(rows.length > 0) {
              let nameString = '';
              let classString = '';
              let ilvlString = '';

              rows.forEach(row => {
                nameString += `${row.name}\n`;
                classString += `${row.spec} ${row.class}\n`;
                ilvlString += `${row.ilvl} - ${isRaidReady(Number(row.ilvl))}\n`;
              });

              embed.setTitle(`${guildName} Raid Roster`)
              embed.setDescription(`Raid composition: **${comp}**\n${avgIlvl}`)
              embed.addField('Name', nameString, true)
              embed.addField('Specialization', classString, true)
              embed.addField('Item Level', ilvlString, true)
              embed.addBlankField(true);
            } else {
              embed.setDescription('There are no members in the roster.')
            }
            
            message.channel.send({embed});
          })
        });
        break;
      }

      case 'help': {
        const embed = new Discord.RichEmbed()
          .setColor(0x00Ae86)
          .setTimestamp()
          .setFooter('Beep Boop.')
          .setTitle('Options')
          .addField('$add [character]', 'Adds your character to the roster. Uses info from last logout')
          .addField('$update [character]', 'Updates your character in the roster. Uses info from last logout')
          .addField('$remove [character]', 'Removes your character from the roster')
          .addField('$roster', 'View the roster')
        message.channel.send({embed});
        break;
      }

      default:
        const embed = new Discord.RichEmbed()
          .setColor(0x00Ae86)
          .setTimestamp()
          .setFooter('Type $help to view more commands. Beep Boop.')
          .setDescription(`Unrecognized command`)
        message.channel.send({embed});
    }
  }
});

client.login(process.env.BOT_TOKEN);
