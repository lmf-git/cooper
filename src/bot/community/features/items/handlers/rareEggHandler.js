import ChannelsHelper from "../../../../core/entities/channels/channelsHelper";
import STATE from "../../../../state";
import PointsHelper from "../../points/pointsHelper";
import ItemsHelper from "../itemsHelper";
import { EGG_DATA } from '../../minigame/small/egghunt';
import MessagesHelper from "../../../../core/entities/messages/messagesHelper";

import EMOJIS from "../../../../core/config/emojis.json";

export default class RareEggHandler {

    static async onReaction(reaction, user) {
        if (reaction.emoji.name === 'rare_egg') {
            try {
                const didUse = await ItemsHelper.use(user.id, 'RARE_EGG', 1);
                if (!didUse) {
                    const failureText = `${user.username} tried to use a rare egg, but has none...`;
                    MessagesHelper.selfDestruct(reaction.message, failureText)
                    MessagesHelper.delayReactionRemoveUser(reaction, user.id, 333);
                } else {
                    const backFired = STATE.CHANCE.bool({ likelihood: 25 });
                    const author = reaction.message.author;
                    const targetID = backFired ? user.id : author.id;

                    // Toxic bomb damage definition.
                    const damage = EGG_DATA['RARE_EGG'].points;

                    // Apply the damage to the target's points.
                    const updatedPoints = await PointsHelper.addPointsByID(targetID, damage);

                    // Calculate feedback text.
                    const damageInfoText = ` ${damage} points (${updatedPoints})`;
                    let actionInfoText = `${user.username} used a rare egg on ${author.username}`;
                    if (backFired) actionInfoText = `${user.username} tried to use a rare egg on ${author.username}, but it backfired`;
                    const feedbackMsgText = `${actionInfoText}: ${damageInfoText}.`;

                    // Send feedback and emojis.
                    ChannelsHelper.codeShoutReact(reaction.message, feedbackMsgText, 'ACTIONS', '💙');
                    // MessagesHelper.delayReactionRemove(reaction, 333);
                    MessagesHelper.delayReact(reaction.message, '💙', 666);
                }
            } catch(e) {
                console.error(e);
            }
        }

        // On 3 average hearts, allow average egg suggestion.
        if (reaction.emoji.name === '💙' && reaction.count === 3)
            // Add average_egg emoji reaction.
            MessagesHelper.delayReact(reaction.message, EMOJIS.RARE_EGG, 333);
    }
   
}