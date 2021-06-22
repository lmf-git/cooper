import { Client } from 'discord.js-commando';
import Database from './database';
import dotenv from 'dotenv';


// v DEV IMPORT AREA v
import COOP, { CHANNELS, USERS } from '../coop';
import BaseHelper from '../../operations/minigames/medium/conquest/baseHelper';
import TempAccessCodeHelper from '../../operations/members/tempAccessCodeHelper';
import VisualisationHelper from '../../operations/minigames/medium/conquest/visualisationHelper';
import { MessageAttachment } from 'discord.js';
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

        // Add directory...

        const stream = CHANNELS._getCode('STREAM');

        await VisualisationHelper.record("https://www.thecoop.group/conquest/world?tile=3", 10000);
        stream.send('TESTING...', new MessageAttachment('/tmp/video.webm'));

        // DEV WORK AND TESTING ON THE LINES ABOVE.
    });
};

shallowBot();