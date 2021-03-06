import { Client } from 'discord.js-commando';
import Database from './database';
import dotenv from 'dotenv';


// v DEV IMPORT AREA v
import COOP, { CHANNELS, ITEMS, MESSAGES, SERVER, USERS } from '../coop';
import BaseHelper from '../../operations/minigames/medium/conquest/baseHelper';
import TempAccessCodeHelper from '../../operations/members/tempAccessCodeHelper';
import VisualisationHelper from '../../operations/minigames/medium/conquest/visualisationHelper';
import { MessageAttachment } from 'discord.js';
import ItemsHelper from '../../operations/minigames/medium/economy/items/itemsHelper';
import ElectionHelper from '../../operations/members/hierarchy/election/electionHelper';
import memberJoined from '../../operations/activity/welcome/joined';
// ^ DEV IMPORT AREA ^

// Load ENV variables.
dotenv.config();


// Commonly useful.
// const listenReactions = (fn) => COOP.STATE.CLIENT.on('messageReactionAdd', fn);
// const listenMessages = (fn) => COOP.STATE.CLIENT.on('message', fn);

const shallowBot = async () => {
    // Instantiate a CommandoJS "client".
    COOP.STATE.CLIENT = new Client({ owner: '786671654721683517' });

    // Connect to Postgres database.
    await Database.connect();
    
    // Login, then wait for the bot to be fully online before testing.
    await COOP.STATE.CLIENT.login(process.env.DISCORD_TOKEN);
    COOP.STATE.CLIENT.on('ready', async () => {
        console.log('Shallow bot is ready');
        // DEV WORK AND TESTING ON THE LINES BELOW.


        // DEV WORK AND TESTING ON THE LINES ABOVE.
    });
};

shallowBot();