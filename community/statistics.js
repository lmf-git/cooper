import ChannelsHelper from "../core/entities/channels/channelsHelper";
import ServerHelper from "../core/entities/server/serverHelper";
import STATE from "../core/state";
import MessageNotifications from "./events/message/messageNotifications";

export default class Statistics {

    // Run on an interval to store server statistics.
    static processMemoryIntoStatistics() {
        // STATE.EVENTS_HISTORY
        // STATE.BOOST_HISTORY
        // STATE.JOIN_HISTORY

        // damage inflicted/items used/items crafted/items destroyed

        // STATE.MESSAGE_HISTORY
        // STATE.REACTION_HISTORY
    }

    static calcCommunityVelocity() {
        let velocity = 1;

        // Calculate the number of current users to adjust ratios.
        const numUsers = ServerHelper._count();

        // Add score of messages (1 per message).
        const totalMsgs = MessageNotifications.getFreshMsgTotalCount();
        const msgPerBeak = totalMsgs / numUsers;

        const activeChannels = Object.keys(STATE.MESSAGE_HISTORY);
        const msgPerChannelBeak = msgPerBeak / activeChannels.length;

        // Calculate the number of active talkers adjusted for average.
        const activeMessagers = activeChannels.reduce((acc, channelID) => {
            const numUsers = STATE.MESSAGE_HISTORY[channelID].users.length;
            return acc += numUsers / numUsers;
        }, 0);
        
        // TODO: Adjust / little bonus for more active messagers.
        velocity += activeMessagers;

        // Add velocity for the channel activity.
        velocity += msgPerChannelBeak;

        return velocity;
    }

    // Use this to calculate and update community velocity.
    // TODO: Drop rates command and velocity command for comparison.
    static offloadMessageStats(data) {
        // TODO: Count # messages
        // Bonus, if bigger author:messages ratio this is better((?))
        // Count # reactions
        // ChannelsHelper._postToChannelCode('TALK', 'Calculate community velocity? Based on? Messages, reactions, joins, boosts, missing any user-driven activity?')


        // If community velocity is higher than record, reward community
        // A rare crate, bonus eggs, etc.

        const velocityText = `Community velocity is ${this.calcCommunityVelocity()}.`
        ChannelsHelper._postToChannelCode('TALK', velocityText);
    }

}