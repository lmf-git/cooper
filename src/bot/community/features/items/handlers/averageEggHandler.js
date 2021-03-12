import ChannelsHelper from "../../../../core/entities/channels/channelsHelper";
import MessagesHelper from "../../../../core/entities/messages/messagesHelper";
import STATE from "../../../../state";
import { EGG_DATA } from "../../minigame/small/egghunt";
import PointsHelper from "../../points/pointsHelper";
import ItemsHelper from "../itemsHelper";
import EMOJIS from "../../../../core/config/emojis.json";


// TODO: Make into "ReactionUsableItem" and add callback

export default class AverageEggHandler {

    static async onReaction(reaction, user) {
        if (reaction.emoji.name === 'average_egg') {
            try {
                const didUse = await ItemsHelper.use(user.id, 'AVERAGE_EGG', 1);
                if (!didUse) {
                    const failureText = `${user.username} tried to use an average egg, but has none. Lul.`;
                    MessagesHelper.selfDestruct(reaction.message, failureText);

                    // TODO: Experimenting with it off.
                    // MessagesHelper.delayReactionRemoveUser(reaction, user.id, 333);

                } else {
                    const backFired = STATE.CHANCE.bool({ likelihood: 25 });
                    const author = reaction.message.author;
                    const targetID = backFired ? user.id : author.id;

                    // Toxic bomb damage definition.
                    const damage = EGG_DATA['AVERAGE_EGG'].points;

                    // Apply the damage to the target's points.
                    const updatedPoints = await PointsHelper.addPointsByID(targetID, damage);

                    // Add visuals animation
                    MessagesHelper.delayReactionRemove(reaction, 333);
                    MessagesHelper.delayReact(reaction.message, '💚', 666);

                    const damageInfoText = ` ${damage} points (${updatedPoints})`;
                    let actionInfoText = `${user.username} used an average egg on ${author.username}`;
                    if (backFired) actionInfoText = `${user.username} tried to use an average egg on ${author.username}, but it backfired`;

                    const feedbackMsgText = `${actionInfoText}: ${damageInfoText}.`;
                    ChannelsHelper.codeShoutReact(reaction.message, feedbackMsgText, 'ACTIONS', '💚');
                }
            } catch(e) {
                console.error(e);
            }
        }


        // On 3 average hearts, allow average egg suggestion.
        if (reaction.emoji.name === '💚' && reaction.count === 3)
            // Add average_egg emoji reaction.
            MessagesHelper.delayReact(reaction.message, EMOJIS.AVERAGE_EGG, 333);
    }
   
}