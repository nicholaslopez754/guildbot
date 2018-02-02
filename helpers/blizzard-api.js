const baseURL = 'https://us.api.battle.net/wow';
const dotenv = require('dotenv').config()
const apikey = process.env.BLIZZARD_API_KEY;
const axios = require('axios');

async function getCharacterSpec(name, realm) {
  const requestURL = baseURL + `/character/${realm}/${name}?fields=talents&locale=en_US&apikey=${apikey}`;
  try {
    const res = await axios.get(requestURL);
    const activeSpec = res.data.talents.filter((spec) => {
      return spec.selected === true;
    })[0];

    return {
      name: res.data.name,
      class: specInfo[res.data.class].name,
      spec: activeSpec.spec.name,
      role: activeSpec.spec.role
    }
  } catch(e) {
    console.log(e);
  }
}

// Hard coded spec info since it's pretty static and
// I'll need some mapping to colors anyways
const specInfo = {
  '1': {
    color: 'C79C6E',
    name: 'Warrior'
  },
  '2': {
    color: 'F58CBA',
    name: 'Paladin'
  },
  '3': {
    color: 'ABD473',
    name: 'Hunter'
  },
  '4': {
    color: 'FFF569',
    name: 'Rogue'
  },
  '5': {
    color: 'FFFFFF',
    name: 'Priest'
  },
  '6': {
    color: 'C41F3B',
    name: 'Death Knight'
  },
  '7': {
    color: '0070DE',
    name: 'Shaman'
  },
  '8': {
    color: '69CCF0',
    name: 'Mage'
  },
  '9': {
    color: '9482C9',
    name: 'Warlock'
  },
  '10': {
    color: '00FF96',
    name: 'Monk'
  },
  '11': {
    color: 'FF7D0A',
    name: 'Druid'
  },
  '12': {
    color: 'A330C9	',
    name: 'Demon Hunter'
  },
}

module.exports = {
  getCharacterSpec,
  specInfo
};
