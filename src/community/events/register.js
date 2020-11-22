import CratedropMinigame from "../features/minigame/small/cratedrop";
import EggHuntMinigame from "../features/minigame/small/egghunt";
import Chance from 'chance';

import joined from "./members/welcome/joined";
import left from "./members/welcome/left";

import messageAddedHandler from "./message/messageAdded";
import reactAddedHandler from "./reaction/reactionAdded";
import ChannelsHelper from "../../bot/core/entities/channels/channelsHelper";
import SacrificeHelper from "../features/events/sacrificeHelper";
import PointsHelper from "../features/points/pointsHelper";
import MiningMinigame from "../features/minigame/small/mining";

export default function registerCommunityEventsHandlers(client) {

  // Add handler for reaction added
  client.on('messageReactionAdd', reactAddedHandler);

  // Handler for a new member has joined
  client.on("guildMemberAdd", joined);

  // Member left handler.
  client.on('guildMemberRemove', left);

  // Message interceptors.
  client.on("message", messageAddedHandler);


  /** ___--___ EVENT/FEATURE RELATED SCHEDULING ___--___ */

  
  const chanceInstance = new Chance;


  // Hourly actions
  setInterval(() => {
    PointsHelper.updateCurrentWinner();
  }, 60 * 60 * 1000);

  // Every 6 hours 25% chance of offering someone for sacrifice.
  setInterval(() => {
    if (chanceInstance.bool({ likelihood: 75 })) SacrificeHelper.random();
  }, ((60 * 60) * 6) * 1000);

  const crateDropInterval = 60 * 60 * 1000;
  setInterval(() => { CratedropMinigame.run(crateDropInterval); }, crateDropInterval);
  setInterval(() => { MiningMinigame.run(); }, crateDropInterval / 4);
  setInterval(() => { EggHuntMinigame.run(); }, crateDropInterval / 4);

// Miscellaneous features.
  setInterval(() => {
    if (chanceInstance.bool({ likelihood: 4 })) ChannelsHelper._postToFeed(';-;');
  }, 60 * 45 * 1000);

  setInterval(() => {
    const extraUs = 'u'.repeat(chanceInstance.natural({ min: 1, max: 20 }));
    if (chanceInstance.bool({ likelihood: 2.5 })) ChannelsHelper._postToFeed('Ruuuuuu' + extraUs);
  }, ((60 * 60) * 3) * 1000);

  setInterval(() => {
    if (chanceInstance.bool({ likelihood: 5 })) ChannelsHelper._postToFeed('._.');
  }, 60 * 120 * 1000);

}