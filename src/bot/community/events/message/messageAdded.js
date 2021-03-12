import Axios from "axios";
import CHANNELS from "../../../core/config/channels.json";
import ChannelsHelper from "../../../core/entities/channels/channelsHelper";
import MessagesHelper from "../../../core/entities/messages/messagesHelper";
import UsersHelper from "../../../core/entities/users/usersHelper";
import STATE from "../../../state";

import achievementPostedHandler from "../../features/encouragement/achievementPosted";
import workPostHandler from "../../features/encouragement/workPosted";
import ConfessionHandler from "../../features/messages/confessionHandler";
import LinkPreviewFilter from "../../features/messages/linkPreviewFilter";
import MiscMessageHandlers from "../../features/messages/miscMessageHandlers";
import PointsHelper from "../../features/points/pointsHelper";
import SuggestionsHelper from "../../features/suggestions/suggestionsHelper";
import SubscriptionHelper from "../../newsletter/subscriptionHelper";
import introPosted from "../members/welcome/introPosted";
import MessageNotifications from "./messageNotifications";


export default async function messageAddedHandler(msg) {  

    // Encourage posters in show work channel.
    if (msg.channel.id === CHANNELS.SHOWWORK.id) workPostHandler(msg);

    // Encourage achievement posters
    if (msg.channel.id === CHANNELS.ACHIEVEMENTS.id) achievementPostedHandler(msg);

    // Encourage intro posts with a wave and coop emoji
    if (msg.channel.id === CHANNELS.INTRO.id) introPosted(msg);

    // Check if suggestion needs handling.
    SuggestionsHelper.onMessage(msg);

    // Add to message notification tracking for keeping people updated on where things are said.
    MessageNotifications.add(msg);

    // Handle reports to leaders.
    ConfessionHandler.onMessage(msg);
    
    // Add newsletter subscription handler/email accepter.
    SubscriptionHelper.onMessage(msg);

    // Miscellaneous jokes and responses.
    MiscMessageHandlers.onMessage(msg);

    // Suppress previews from links but add toggle react.
    LinkPreviewFilter.onMessage(msg);
}