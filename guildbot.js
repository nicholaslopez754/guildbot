// Packages & helpers
const Discord = require('discord.js');
const Blizzard = require('./helpers/blizzard-api.js');
const dotenv = require('dotenv').config();
const mysql = require('mysql');

// Client instance
const client = new Discord.Client();

// DB instance
const connection = mysql.createConnection({
  host     : 'localhost',
  user     : process.env.MYSQL_USER,
  password : process.env.MYSQL_PASSWORD,
  database : 'guild_db'
});

//  Start up
client.on('ready', async () => {
  // Connect to DB
  try {
    const res = await connection.connect();
    console.log('Connected to mysql');
  } catch(err) {
    console.log(err);
  }
  // Create roster table if it doesn't exist
  const stmt = `
    CREATE TABLE members (
      name VARCHAR(255),
      role VARCHAR(255),
      class VARCHAR(255),
      spec VARCHAR(255)
    )`

  try {
    const res = connection.query(stmt);
    console.log('Created members table');
  } catch(err) {
    console.log(err);
  }
  console.log('Guildbot initialized');
});

// Event handler for user interaction
const prefix = '!';
client.on('message', async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  if(message.content.startsWith(prefix)) {
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    switch(command) {
      case 'add':
        const charData = await Blizzard.getCharacterSpec(args[0], args[1]);

        break;
      case 'update':
        break;
      case 'remove':
        break;
      case 'roster':
        break;
      default:
        message.channel.send('Unrecognized command. Try again or type !help for more help');
    }
  }
});

client.login(process.env.BOT_TOKEN);
