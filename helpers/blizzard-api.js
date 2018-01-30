const baseURL = 'https://us.api.battle.net/wow';
require('dotenv').config()
const apikey = process.env.BLIZZARD_API_KEY;
const axios = require('axios');

async function getCharacterSpec(name, realm) {
  const requestURL = baseURL + `/character/${realm}/${name}?fields=talents&locale=en_US&apikey=${apikey}`;
  try {
    const res = await axios.get(requestURL);
    const playerClass = await getClassFromID(res.data.class);
    const activeSpec = res.data.talents.filter((spec) => {
      return spec.selected === true;
    })[0];

    return {
      name: res.data.name,
      class: playerClass,
      spec: activeSpec.spec.name,
      role: activeSpec.spec.role
    }
  } catch(e) {
    console.log(e);
  }
}

async function getClassFromID(id) {
  const requestURL = baseURL + `/data/character/classes?locale=en_US&apikey=${apikey}`;
  try {
    const res = await axios.get(requestURL);
    const classInfo = res.data.classes.filter((elem) => {
      return elem.id === id;
    })[0];
    return classInfo.name;
  } catch(e) {
    console.log(e);
  }
}


module.exports = {
  getCharacterSpec
};
