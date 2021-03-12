import ChannelsHelper from "../../../../core/entities/channels/channelsHelper";
import MessagesHelper from "../../../../core/entities/messages/messagesHelper";
import STATE from "../../../../state";
import PointsHelper from "../../points/pointsHelper";
import ItemsHelper from "../itemsHelper";

export default class ToxicEggHandler {

    static async onReaction(reaction, user) {
        if (reaction.emoji.name === 'toxic_egg') {
            try {
                const didUse = await ItemsHelper.use(user.id, 'TOXIC_EGG', 1);
                if (!didUse) {
                    setTimeout(async () => {
                        const unableMsg = await reaction.message.say(
                            `${user.username} tried to use a toxic egg, but has none.`
                        );
                        setTimeout(() => { unableMsg.delete(); }, 10000);
                    }, 666);
                    return await reaction.users.remove(user.id);
                } else {
                    const backFired = STATE.CHANCE.bool({ likelihood: 25 });
                    const author = reaction.message.author;
                    const targetID = backFired ? user.id : author.id;

                    // Toxic bomb damage definition.
                    const damage = -3

                    // Apply the damage to the target's points.
                    const updatedPoints = await PointsHelper.addPointsByID(targetID, damage);

                    // Add visuals animation
                    MessagesHelper.delayReactionRemove(reaction, 333);
                    MessagesHelper.delayReact(reaction.message, '☢️', 666);

                    const damageInfoText = ` ${damage} points (${updatedPoints})`;
                    let actionInfoText = `${user.username} used a toxic egg on ${author.username}`;
                    if (backFired) actionInfoText = `${user.username} tried to use a toxic egg on ${author.username}, but it backfired`;

                    const feedbackMsgText = `${actionInfoText}: ${damageInfoText}.`;

                    if (!ChannelsHelper.checkIsByCode(reaction.message.channel.id, 'FEED')) {
                        const feedbackMsg = await reaction.message.say(feedbackMsgText);
                        setTimeout(() => { feedbackMsg.react('☢️'); }, 1333);
                        setTimeout(() => { feedbackMsg.delete(); }, 10000);
                    }
                    await ChannelsHelper._postToChannelCode('ACTIONS', feedbackMsgText);
                }
            } catch(e) {
                console.error(e);
            }
        }

        // On 3 average hearts, allow average egg suggestion.
        if (reaction.emoji.name === '☢️' && reaction.count === 3)
            // Add legendary_egg emoji reaction.
            MessagesHelper.delayReact(reaction.message, EMOJIS.TOXIC_EGG, 333);
        
    }
   
}