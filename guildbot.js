// Packages
const Discord = require('discord.js');
const mysql = require('mysql');
const Blizzard = require('./helpers/blizzard-api.js')

require('dotenv').config()

const client = new Discord.Client();

//  Start up
client.on('ready', () => {
  console.log('Guildbot initialized');
});

// Event handler for user interaction
const prefix = '!';
client.on('message', async (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  if(message.content.startsWith(prefix)) {
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    const data = await Blizzard.getCharacterSpec(args[0], args[1]);
    const response = `${data.name}: ${data.spec} ${data.class} (${data.role})`
    message.channel.send(response);
  }
});

client.login(process.env.BOT_TOKEN);
