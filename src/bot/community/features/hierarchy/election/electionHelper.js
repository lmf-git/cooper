import moment from 'moment';
import _ from 'lodash';

import Chicken from "../../../chicken";
import Database from '../../../../core/setup/database';

import CHANNELS from '../../../../core/config/channels.json';

import ChannelsHelper from "../../../../core/entities/channels/channelsHelper";
import MessagesHelper from '../../../../core/entities/messages/messagesHelper';
import ServerHelper from '../../../../core/entities/server/serverHelper';
import UsersHelper from '../../../../core/entities/users/usersHelper';
import TimeHelper from '../../server/timeHelper';
import DatabaseHelper from '../../../../core/entities/databaseHelper';
import VotingHelper from '../../../events/voting/votingHelper';
import RolesHelper from '../../../../core/entities/roles/rolesHelper';
import ItemsHelper from '../../items/itemsHelper';

// TODO:
// Vote _once_ for candidate. [DONE - WITH PROBLEMS]
// Stand for election [DONE - WITH PROBLEMS]

// Inspect candidates list (tio 10)
// track voting like US election
// Create election results table 
// Inspect candidate campaign
// Election over unix timestamp

export default class ElectionHelper {

    // Duration of election voting
    static VOTING_DUR_SECS = (3600 * 24) * 7;

    // Allow for a week of voting before reset.
    static TERM_DUR_SECS = ((3600 * 24) * 30) + this.VOTING_DUR_SECS;

    static async addVote(userID, candidateID) {
        const query = {
            name: "add-vote",
            text: `INSERT INTO election_votes(candidate_id, voter_id, time)
                VALUES($1, $2, $3)`,
            values: [candidateID, userID, (parseInt(Date.now() / 1000))]
        };
        
        const result = await Database.query(query);
        return result;
    }

    static async clearElection() {
        // vv same as below but for votes.
        await this.clearVotes();
        await this.clearCandidates();
    }

    static async clearVotes() {
        const query = {
            name: "delete-votes",
            text: `DELETE FROM election_votes`
        };
        
        const result = await Database.query(query);
        return result;
    }

    static async clearCandidates() {
        const candidates = await this.getAllCandidates();
        
        // Bulk delete may be better here.
        // Ensure all messages deleted, use bulk delete won't be outside of 14 days
        candidates.map((candidate, index) => {
            setTimeout(() =>
                MessagesHelper.deleteByLink(candidate.campaign_msg_link), 
                1500 * index
            );
        });

        // Clear database
        const query = {
            name: "delete-candidates",
            text: `DELETE FROM candidates`
        };
        const result = await Database.query(query);
        return result;
    }

    static async votingPeriodLeftSecs() {
        let leftSecs = 0;

        const isVotingPeriod = await this.isVotingPeriod();
        if (isVotingPeriod) {
            const endOfVoting = (await this.lastElecSecs()) + this.VOTING_DUR_SECS;
            const diff = endOfVoting - parseInt(Date.now() / 1000);
            if (diff > 0) leftSecs = diff;
        }

        return leftSecs;
    }

    static async isVotingPeriod() {
        try {
            const isElectionOn = await this.isElectionOn();
            const nowSecs = parseInt(Date.now() / 1000);
            const lastElectionSecs = await this.lastElecSecs();

            let isVotingOn = false;

            // Check if current moment is earlier than the end of voting.
            if (isElectionOn && nowSecs < lastElectionSecs + this.VOTING_DUR_SECS)
                isVotingOn = true;
                
            // If election isn't running, check if next election period due.
            if (!isElectionOn && nowSecs > lastElectionSecs + this.TERM_DUR_SECS) 
                isVotingOn = true;

            return isVotingOn;

        } catch(e) {
            console.log('Voting period check failure.')
            console.error(e);
        }
    }

    static async startElection() {
        try {
            // Turn election on and set latest election to now! :D
            await Chicken.setConfig('election_on', 'true');
            await Chicken.setConfig('last_election', parseInt(Date.now() / 1000));
            
            // Update the election message
            const readableElecLeft = TimeHelper.humaniseSecs((await this.votingPeriodLeftSecs()));
            const startElecText = `The election is currently ongoing! Time remaining: ${readableElecLeft}`;
            await this.editElectionInfoMsg(startElecText);

            // Inform all members so they can fairly stand.
            const feedMsg = await ChannelsHelper._postToFeed(
                `@everyone, our latest <#${CHANNELS.ELECTION.id}> is running, all members are welcome to stand or vote for their preferred commander and leaders. \n` +
                `For further information on our elections refer to our forth amendment in <#${CHANNELS.CONSTITUTION.id}>\n\n` +
                `To stand for election, send in any channel this message: \n\n !stand ((and your campaign message here, brackets - () - not needed)) \n\n` +
                `Time remaining: ${readableElecLeft}.`
            );

            // TODO: React crown to this message.
            MessagesHelper.delayReact(feedMsg, '👑', 666);

        } catch(e) {
            console.log('Starting the election failed... :\'(');
            console.error(e);
        }
    }

    static getMaxNumLeaders() {
        return VotingHelper.getNumRequired(ServerHelper._coop(), .025);
    }

    // Provide updates and functionality for an ongoing election.
    static async commentateElectionProgress() {
        const votes = await this.fetchAllVotes();

        const readableElecLeft = TimeHelper.humaniseSecs((await this.votingPeriodLeftSecs()));

        const hierarchy = this.calcHierarchy(votes);
        const maxNumLeaders = this.getMaxNumLeaders();
        const numLeaders = hierarchy.leaders.length;

        const electionProgressText = `**Election is still running for ${readableElecLeft}, latest vote results:**` +
            `\n\n` +
            `**Commander:** ${hierarchy.commander ? 
                `${hierarchy.commander.username} (${hierarchy.commander.votes} Votes)` : ''}` +
            `\n\n` +
            `**Leaders ${numLeaders}/${maxNumLeaders}:**\n${
                hierarchy.leaders
                    .map(leader => `${leader.username} (${leader.votes} Votes)`)
                    .join('\n')
            }` +
            `\n\n`;

        await this.editElectionInfoMsg(electionProgressText);
        
        ChannelsHelper._codes(['FEED', 'TALK'], electionProgressText);

        // Note: Votes aren't saved in the database... we rely solely on Discord counts.
    }

    static async endElection() {
        try {
            const votes = await this.fetchAllVotes();
            const hierarchy = this.calcHierarchy(votes);
           
            // Remove roles from previous hierarchy.
            await this.resetHierarchyRoles();

            // Add roles to winners.
            await RolesHelper._add(hierarchy.commander.id, 'COMMANDER');
            await Promise.all(hierarchy.leaders.map(async (leader, index) => {
                await new Promise(r => setTimeout(r, 777 * index));
                await RolesHelper._add(leader.id, 'LEADER');
                return true;
            }));

            // Cleanup database records fresh for next run.
            await this.clearElection();

            // Set Cooper's config election_on to 'false' so he does not think election is ongoing.
            await Chicken.setConfig('election_on', 'false');

            const nextElecFmt = await this.nextElecFmt();

            // Announce the winners!
            const declareText = `**Latest <#${CHANNELS.ELECTION.id}> ends with these results!**\n\n` +

                `**New Commander:**\n${hierarchy.commander.username}\n\n` +

                `**New Leaders:** \n` +
                    `${hierarchy.leaders.map(leader => `${leader.username} (${leader.votes} Votes)`).join('\n')}\n\n` +

                `**Next Election:** ${nextElecFmt}.`;
            
            ChannelsHelper._postToFeed(declareText);
            await this.editElectionInfoMsg(declareText);


            // Handle election items.
            await this.resetHierarchyItems();

            // Add the election items.
            ItemsHelper.add(hierarchy.commander.id, 'ELECTION_CROWN', 1);
            Promise.all(hierarchy.leaders.map(async (leader, index) => {
                await new Promise(r => setTimeout(r, 333 * index));
                await ItemsHelper.add(leader.id, 'LEADERS_SWORD', 1);
                return true;
            }));

        } catch(e) {
            console.log('Something went wrong ending the election...');
            console.error(e);
        }
    }

    static async resetHierarchyRoles() {
        try {
            const exCommander = RolesHelper._getUsersWithRoleCodes(['COMMANDER']).first();
            const exLeaders = RolesHelper._getUsersWithRoleCodes(['LEADER']);
            
            let index = 0;
            await Promise.all(exLeaders.map(async (exLeader) => {
                index++;
                await new Promise(r => setTimeout(r, 777 * index));
                await RolesHelper._remove(exLeader.user.id, 'LEADER');
                return true;
            }));
            await RolesHelper._remove(exCommander.user.id, 'COMMANDER');
    
            // Add former commander to ex commander!
            await RolesHelper._add(exCommander.user.id, 'FORMER_COMMANDER');
    
            return true;

        } catch(e) {
            console.log('Error resetting hierarchy roles.');
            console.error(e);
        }
    }

    static async resetHierarchyItems() {
        try {
            const leaderItems = await ItemsHelper.getUsersWithItem('LEADERS_SWORD');
            const commanderItems = await ItemsHelper.getUsersWithItem('ELECTION_CROWN');        

            let index = 0;
            await Promise.all(leaderItems.map(async (exLeader) => {
                index++;
                await new Promise(r => setTimeout(r, 777 * index));
                await ItemsHelper.subtract(exLeader.owner_id, 'LEADERS_SWORD');
                return true;
            }));

            if (commanderItems) await ItemsHelper.subtract(commanderItems[0].owner_id, 'ELECTION_CROWN', 1);
            return true;

        } catch(e) {
            console.log('Error reseting hierarchy items');
            console.error(e);
        }
    }

    static async ensureItemSeriousness() {
        try {
            // Load hierarchy on basis of items.
            const leaderItems = await ItemsHelper.getUsersWithItem('LEADERS_SWORD');
            const commanderItem = await ItemsHelper.getUserWithItem('ELECTION_CROWN');
            const swordOwners = leaderItems.map(item => item.owner_id);

            // Load users by roles for comparison/checking.
            const roleHierarchy = this._roleHierarchy();
            
            // Any leader who has role but not leaders_sword -> role removed.
            roleHierarchy.leaders.map(leader => {
                // Check each role item for existence in leader items ownership data.
                if (!swordOwners.includes(leader.user.id) && RolesHelper._has(leader, 'LEADER'))
                    RolesHelper._remove(leader.user.id, 'LEADER');
            });
            
            // Any commander who has role but not election_crown -> role removed.
            if (roleHierarchy.commander) {
                const isUsurper = commanderItem.owner_id !== roleHierarchy.commander.user.id;
                if (isUsurper && RolesHelper._has(roleHierarchy.commander, 'COMMANDER'))
                    RolesHelper._remove(roleHierarchy.commander.user.id, 'COMMANDER');
            }
        
            // Get leaders by loading members via IDs
            const rightfulLeaders = UsersHelper._filter(user => swordOwners.includes(user.id));

            // Any leader who has leaders_sword but not role -> leaders_sword added.
            rightfulLeaders.map(leader => {
                if (!RolesHelper._has(leader, 'LEADER'))
                    RolesHelper._add(leader.user.id, 'LEADER');
            });

            // Any commander who has election_crown but not role -> election_crown added.
            const rightfulCommander = UsersHelper._get(commanderItem.owner_id);
            if (!RolesHelper._has(rightfulCommander, 'COMMANDER'))
                RolesHelper._add(rightfulCommander.user.id, 'COMMANDER');

        } catch(e) {
            console.log('Error ensuring item seriousness.');
            console.error(e);
        }
    }

    static async checkProgress() {
        let electionStarted = false;
        try {
            const isElecOn = await this.isElectionOn();
            const isVotingPeriod = await this.isVotingPeriod();

            // TODO: May need to clean up any non-info/candidates messages leftover.

            // Election needs to be started?
            if (isVotingPeriod && !isElecOn) {
                await this.startElection();
                electionStarted = true;
            }
    
            // Election needs to be declared?
            if (!isVotingPeriod && isElecOn) await this.endElection();
    
            // Election needs to announce update?
            if (isVotingPeriod && isElecOn) await this.commentateElectionProgress();
            
            // If election isn't running (sometimes) update about next election secs.
            if (!isElecOn && !electionStarted) await this.countdownFeedback();

        } catch(e) {
            console.log('SOMETHING WENT WRONG WITH CHECKING ELECTION!');
            console.error(e);
        }
    }

    static async getElectionMsg() {
        const electionInfoMsgLink = await Chicken.getConfigVal('election_message_link');
        const msgData = MessagesHelper.parselink(electionInfoMsgLink);   
        const channel = ChannelsHelper._get(msgData.channel);
        const msg = await channel.messages.fetch(msgData.message);
        return msg;
    }

    static async editElectionInfoMsg(text) {
        const msg = await this.getElectionMsg();
        const editedMsg = await msg.edit(text);
        return editedMsg;
    }

    static async getVoteByVoterID(voterID) {
        const query = {
            name: "get-voter",
            text: `SELECT * FROM election_votes WHERE voter_id = $1`,
            values: [voterID]
        };
        
        const result = await Database.query(query);
        const voter = DatabaseHelper.single(result);

        return voter;
    }

    // Check if this reaction applies to elections.
    static async onReaction(reaction, user) {
        // Check if occurred in election channel
        if (reaction.message.channel.id !== CHANNELS.ELECTION.id) return false;

        // Ignore Cooper's prompt emoji.
        if (UsersHelper.isCooper(user.id)) return false;

        // Check if reaction is crown (indicates vote)
        if (reaction.emoji.name !== '👑') return false;

        try {
            // Check if reaction message is a campaign message and get author.
            const msgLink = MessagesHelper.link(reaction.message);
            const candidate = await this.getCandByMsgLink(msgLink); 

            // If is candidate message and identified, allow them the vote.
            if (candidate) {
                // Check if already voted
                const vote = await this.getVoteByVoterID(user.id);
                const candidateUser = (await UsersHelper._getMemberByID(candidate.candidate_id)).user;

                // Add vote to database
                await this.addVote(user.id, candidate.candidate_id);
                
                // Disabled vote limits, but use it to prevent feedback spam.
                if (!vote) {
                    // Announce and update.
                    await this.commentateElectionProgress();
            
                    // Acknowledge vote in feed.
                    ChannelsHelper._postToFeed(`${user.username} cast their vote for ${candidateUser.username}!`);
                }
            }
        } catch(e) {
            console.log('Could not process election vote.');
            console.error(e);
        }
    }

    static async countVotes() {
        const query = {
            name: "get-candidate",
            text: `SELECT candidateID, COUNT(*) FROM votes GROUP BY candidateID`,
            values: [userID]
        };

        const result = await Database.query(query);
        return result;
    }

    static calcHierarchy(votes) {
        const commander = votes[0];
        const numLeaders = this.getMaxNumLeaders();
        const leaders = votes.slice(1, numLeaders + 1);

        const hierarchy = { commander, leaders, numLeaders };

        return hierarchy;
    }

    static async loadAllCampaigns() {
        const candidates = await this.getAllCandidates();
        const preloadMsgIDs = candidates.map(candidate => 
            MessagesHelper.parselink(candidate.campaign_msg_link)
        );

        // Preload each candidate message.
        let campaigns = await Promise.allSettled(preloadMsgIDs.map((idSet, index) => {
            const guild = ServerHelper._coop();
            return new Promise((resolve, reject) => {
                setTimeout(async () => {
                    try {
                        // This could be more efficient.
                        const chan = guild.channels.cache.get(idSet.channel);
                        if (chan) {
                            const msg = await chan.messages.fetch(idSet.message);
                            if (msg) resolve(msg);
                            // else reject('load_failure');
                        }
                    } catch(e) {
                        console.log(idSet);
                        console.log('Error loading campaign message')
                        // reject(e);
                    }
                }, 666 * index);
            });
        }));

        // take only the fulfilled ones, let the rest keep failing until they're cleaned up.
        campaigns = campaigns
            .filter(campaign => campaign.status === 'fulfilled')
            .map(campaign => campaign.value);

        return campaigns;
    }

    static async getCandByMsgLink(msgLink) {
        const query = {
            name: "get-candidate-by-msg",
            text: `SELECT * FROM candidates WHERE campaign_msg_link = $1`,
            values: [msgLink]
        };

        let candidate = null;
        const result = await Database.query(query);

        if (result.rows) candidate = result.rows[0];

        return candidate;
    }

    // TODO: could use this feature/data to direct message the candidates an update
    static async fetchAllVotes() {
        const votes = [];

        // Calculate votes and map author data.
        const campaignMsgs = await this.loadAllCampaigns();
        campaignMsgs.map(campaignMsg => {
            // Find the candidate for these reactions.
            let candidate = null;
            const embed = campaignMsg.embeds[0] || null;
            if (embed) {
                const idMatches = embed.description.match(/\<@(\d+)\>/gms);
                let embedUserID = idMatches[0];
                embedUserID = embedUserID.replace('<@', '');
                embedUserID = embedUserID.replace('>', '');
                if (embedUserID) candidate = UsersHelper._getMemberByID(embedUserID).user;
            }

            // Add to the overall data.
            if (candidate) {
                votes.push({
                    username: candidate.username,
                    id: candidate.id,
                    votes: campaignMsg.reactions.cache.reduce((acc, reaction) => {
                        // Count all crown reactions.
                        if (reaction.emoji.name === '👑') return acc += (reaction.count - 1);
                        else return 0;
                    }, 0)
                });
            }
        });
   
        votes.sort((a, b) => {
            if (a.votes < b.votes) return 1;
            if (a.votes > b.votes) return -1;
            return 0;
        });

        return votes;
    }

    static async getCandidate(userID) {
        const query = {
            name: "get-candidate",
            text: `SELECT * FROM candidates WHERE candidate_id = $1`,
            values: [userID]
        };
        
        const result = await Database.query(query);
        const candidate = DatabaseHelper.single(result);

        return candidate;
    }


    // Preload campaign messages into cache so they are always reactable.
    static async onLoad() {
        const isElectionOn = await this.isVotingPeriod();
        if (isElectionOn) {
            await this.loadAllCampaigns();
            console.warn('Cached election candidates.');
        }
    }

    static async addCandidate(userID, msgLink) {
        const query = {
            name: "add-candidate",
            text: `INSERT INTO candidates(campaign_msg_link, candidate_id)
                VALUES($1, $2)`,
            values: [msgLink, userID]
        };
        
        const result = await Database.query(query);
        return result;
    }

    static async getAllCandidates() {
        const query = {
            name: "get-all-candidates",
            text: `SELECT * FROM candidates`
        };
        
        let candidates = null;
        const result = await Database.query(query);
        if (result.rows) candidates = result.rows;

        return candidates;
    }

    static async shouldTriggerStart() {
        const isVotingPeriod = await this.isVotingPeriod();
        const isElecOn = await this.isElectionOn();

        if (isVotingPeriod && !isElecOn) this.checkProgress();
    }


    static async lastElecSecs() {
        const lastElecSecsVal = await Chicken.getConfigVal('last_election');
        const lastElecSecs = parseInt(lastElecSecsVal);
        return lastElecSecs;        
    }

    static async lastElecFmt() {
        const lastElecSecs = await this.lastElecSecs();
        const lastElecMoment = moment.unix(lastElecSecs);
        return lastElecMoment.format('dddd, MMMM Do YYYY, h:mm:ss a');
    }

    static async nextElecFmt() {
        const nextElecSecs = await this.nextElecSecs();
        const nextElecMoment = moment.unix(nextElecSecs);
        return nextElecMoment.format('dddd, MMMM Do YYYY, h:mm:ss a');
    }

    static async nextElecSecs() {
        const lastElecSecs = await this.lastElecSecs();
        const nextElecSecs = lastElecSecs + this.TERM_DUR_SECS;
        return nextElecSecs;
    }

    // This is only active from next election interval moment to a week after that
    static async isElectionOn() {
        const electionOnVal = await Chicken.getConfigVal('election_on');
        return electionOnVal === 'true';
    }

    static async isElectionTime() {
        const lastElecSecs = await this.lastElecSecs();
        const nextElecSecs = await this.nextElecSecs();
        const nextDeclareSecs = lastElecSecs + this.TERM_DUR_SECS + this.VOTING_DUR_SECS;

        const nowSecs = parseInt(Date.now() / 1000);

        if (nowSecs >= nextElecSecs && nowSecs <= nextDeclareSecs) return true;

        return false;
    }

    static _roleHierarchy() {
        const hierarchy = {
            commander: RolesHelper._getUserWithCode('COMMANDER'),
            leaders: RolesHelper._getUsersWithRoleCodes(['LEADER'])
        };
        return hierarchy;
    }

    static async countdownFeedback() {
        const elecMsg = await this.getElectionMsg();
        const diff = parseInt(Date.now()) - elecMsg.editedTimestamp;
        const hour = 360000;

        if (diff > hour * 8) {
            const diff = await this.nextElecSecs() - parseInt(Date.now() / 1000)
            const humanRemaining = TimeHelper.humaniseSecs(diff);
            const nextElecReadable = await this.nextElecFmt();

            const hierarchy = this._roleHierarchy();

            await this.editElectionInfoMsg(
                `**Election is over, here are your current officials:** \n\n` +

                `**Commander:**\n${hierarchy.commander.user.username} :crown: \n\n` +

                `**Leaders:**\n` +
                    `${hierarchy.leaders.map(leader => `${leader.user.username} :crossed_swords:`).join('\n')}\n\n` +

                `**Next Election:** ${nextElecReadable} (${humanRemaining})`
            );
        }
    }

}