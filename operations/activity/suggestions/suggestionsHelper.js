import { EMOJIS, CHANNELS as CHANNELS_CONFIG } from "../../../origin/config";
import { SERVER, CHANNELS, USERS, MESSAGES } from "../../../origin/coop";


// TODO: Make sure when adding to roadmap, talk, and feed that the votes are displayed to indicate mandate!
export default class SuggestionsHelper {

    static onMessage(msg) {
        if (msg.channel.id === CHANNELS_CONFIG.SUGGESTIONS.id && !msg.author.bot) 
            CHANNELS._postToFeed(`New suggestion: <#${CHANNELS_CONFIG.SUGGESTIONS.id}>`);
    }

    static async check() {
        // Get last 25 suggestions to check through.
        const suggestionsParts = Array.from(await CHANNELS._getCode('SUGGESTIONS').messages.fetch({ limit: 50 }));
        let processedOne = false;

        // Process latest ONE suggestion.
        // TODO: Sort by eldest.
        suggestionsParts.map((suggestionPart, index) => {
            const suggestion = suggestionPart[1] || null;

            if (!processedOne) {
                // Prevent invalid suggestions being processed (again?).
                if (!suggestion) return false;

                // Calculate if completed based on time/duration.
                const considerDuration = ((60 * 60) * 72) * 1000;
                const isCompleted = considerDuration + suggestion.createdTimestamp <= Date.now();
                
                // If this suggestion is completed, attempt to process it.
                if (isCompleted) {
                    // Calculate the decision of this suggestion based on reaction votes.
                    const votes = this.parseVotes(suggestion);

                    // Handle the will of the people.
                    if (votes.rejected) this.reject(suggestion, votes, index);
                    if (votes.passed) this.pass(suggestion, votes, index);
                    if (votes.tied) this.tied(suggestion, votes, index);
    
                    // Invalidate votes do not count as a vote processed.
                    if (votes.invalid) this.invalidate(suggestion, index);
    
                    // Prevent processing more, one action per iteration is enough.
                    if (votes.tied || votes.passed || votes.rejected) 
                        processedOne = true;
                }
            }
        });
    }

    // Post a link in feed and talk to try to break the deadlock.
    static tied(suggestion, votes, index) {
        setTimeout(() => {
            try {
                const link = MESSAGES.link(suggestion);
                const tiedText = `Tied suggestion detected, please break the deadlock: \n\n ${link} \n\n` +
                    `${EMOJIS.POLL_FOR.repeat(votes.for)}${EMOJIS.POLL_AGAINST.repeat(votes.against)}`;
    
                ['TALK', 'FEED'].forEach((channelKey, channelIndex) => {
                    setTimeout(
                        () => CHANNELS._postToChannelCode(channelKey, tiedText), 
                        channelIndex * 666
                    );
                });
            } catch(e) {
                console.log('Tied suggestion handling error');
                console.error(e);
            }
        }, index * 5000);
    }

    static invalidate(suggestion, index) {
        setTimeout(async () => {
            try {
                // If not a cooper message, we know who to notify.
                if (!USERS.isCooperMsg(suggestion)) {
                    const warningText = `Suggestion removed, please use !poll [text] to make suggestions. \n` +
                        `Your suggestion was: ${suggestion.content}`;
                    await USERS.directMSG(SERVER._coop(), suggestion.author.id, warningText);
                }

                // Delete the message with a delay to avoid rate limiting.
                MESSAGES.delayDelete(suggestion, 3333 * index);

            } catch(e) {
                console.log('Error during invalidation of suggestion');
                console.error(e);
            } 
        }, 5555 * index);
    }

    static parseVotes(msg) {
        const votes = {
            for: 0,
            against: 0,
            passed: false,
            rejected: false,
            tied: false,
            invalid: false,
            roadmap: false
        };

        if (USERS.isCooperMsg(msg)) {
            msg.reactions.cache.map(reaction => {
                if (reaction.emoji.name === EMOJIS.POLL_FOR) votes.for = reaction.count;
                if (reaction.emoji.name === EMOJIS.POLL_AGAINST) votes.against = reaction.count;
                if (reaction.emoji.name === EMOJIS.ROADMAP) votes.roadmap = true;
            });
        } else votes.invalid = true;

        if (!votes.invalid) {
            if (votes.for > votes.against) votes.passed = true;
            if (votes.for < votes.against) votes.rejected = true;
            if (votes.for === votes.against) votes.tied = true;
        }

        return votes;
    }

    static async pass(suggestion, votes, index) {
        setTimeout(() => {
            try {
                // Reward the person who posted the suggestion for contributing to the community
                // TODO: ^
                // console.log(suggestion.mentions);

                const passedText = `Suggestion passed, proposal: ${suggestion.content}\n` +
                    `${EMOJIS.POLL_FOR.repeat(votes.for)}${EMOJIS.POLL_AGAINST.repeat(votes.against)}`;
                
                // Inform the server of passed suggestion.
                CHANNELS._codes(['TALK', 'FEED', 'ROADMAP'], passedText);

                // Post to roadmap if necessary
                // if (votes.roadmap) CHANNELS._postToChannelCode('ROADMAP', suggestion.content);

                // Delete the message with a delay to avoid rate limiting.
                MESSAGES.delayDelete(suggestion, 3333 * index);
            } catch(e) {
                console.log('Reject suggestion handling error');
                console.error(e);
            }
        }, index * 5000);
    }

    static async reject(suggestion, votes, index) {
        setTimeout(() => {
            try {
                const rejectedText = `Suggestion rejected, proposal: ${suggestion.content}\n` +
                    `${EMOJIS.POLL_FOR.repeat(votes.for)}${EMOJIS.POLL_AGAINST.repeat(votes.against)}`;
                
                // Inform the server of rejected suggestion.
                ['TALK', 'FEED'].forEach((channelKey, channelIndex) => {
                    setTimeout(
                        () => CHANNELS._postToChannelCode(channelKey, rejectedText), 
                        channelIndex * 666
                    );
                });

                // Delete the message with a delay to avoid rate limiting.
                MESSAGES.delayDelete(suggestion, 3333 * index);
            } catch(e) {
                console.log('Reject suggestion handling error');
                console.error(e);
            }
        }, index * 5000);
    }

    // static async onReaction() {
    //     // console.log('Suggestion reaction');
    // }

    // static async onAdd() {
    //     // Validate a suggestion when it is originally added, part of house cleaning.   
    // }

}