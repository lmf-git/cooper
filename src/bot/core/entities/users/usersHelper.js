import STATE from "../../../state";
import Database from "../../setup/database";
import ServerHelper from "../server/serverHelper";

export default class UsersHelper {
    static avatar(user) {
        const avatarURL = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
        return avatarURL;
    }

    static getMemberByID = (guild, id) => guild.members.cache.get(id);

    static fetchMemberByID = (guild, id) => guild.members.fetch(id);

    static hasRoleID = (member, id) => {
        return member.roles.cache.get(id);
    }

    static hasRoleNames = (guild, member, roleNames) => 
        guild.roles.cache
            .filter(role => roleNames.includes(role.name))
            .some(role => member.roles.cache.has(role.id));

    static count(guild, includeBots = false) {
        return guild.memberCount;
        // if (includeBots) return guild.members.cache.size;
        // else return this.filterMembers(guild, member => !member.user.bot).size; 
    }

    static directMSG = (guild, userID, msg) => UsersHelper.getMemberByID(guild, userID).send(msg);

    static _dm(userID, msg) {
        const guild = ServerHelper._coop();
        this.directMSG(guild, userID, msg);
    }
    
    static getOnlineMembers = (guild) => guild.members.cache.filter(member => member.presence.status === 'online');
    
    static filterMembers = (guild, filter) => guild.members.cache.filter(filter);

    static getOnlineMembersByRoles(guild, roleNames) {
        const notificiationRoles = guild.roles.cache.filter(role => roleNames.includes(role.name));
        
        return this.filterMembers(guild, member => {
            const matchingRoles = notificiationRoles.some(role => member.roles.cache.has(role.id));
            const isOnline = member.presence.status === 'online';
            return matchingRoles && isOnline;
        });
    }

    static getMembersByRoleID(guild, roleID) {
        return guild.members.cache.filter(member => !!member.roles.cache.get(roleID));
    }

    static async removeFromDatabase(member) {
        const query = {
            name: "remove-user",
            text: "DELETE FROM users WHERE discord_id = $1",
            values: [member.user.id]
        };
        return await Database.query(query);
    }

    static async addToDatabase(member) {
        const query = {
            name: "add-user",
            text: "INSERT INTO users(discord_id, join_date, points) VALUES ($1, $2, $3)",
            values: [member.user.id, member.joinedDate, 0]
        };
        return await Database.query(query);
    }

    static async setIntro(member, link, time) {
        const query = {
            name: "set-user-intro",
            text: 'UPDATE users SET intro_time = $1, intro_link = $2 WHERE discord_id = $3 RETURNING intro_link, intro_time',
            values: [time, link, member.user.id],
        };
        return await Database.query(query);
    }

    static async load() {
        const query = {
            name: "get-users",
            text: "SELECT * FROM users"
        };
        return await Database.query(query);        
    }

    // TODO: Can refactor this to a more optimised db query.
    static async _random() {
        let member = null;
        const usersQuery = await this.load();
        const rowCount = usersQuery.rowCount || 0;
        const users = usersQuery.rows || [];
        if (rowCount > 0) {
            const randomIndex = STATE.CHANCE.natural({ min: 0, max: rowCount });
            const randomUser = users[randomIndex];
            
            member = await ServerHelper._coop().members.fetch(randomUser.discord_id);
        }
        return member;
    }

    static isCooper(id) {
        return STATE.CLIENT.user.id === id;
    }

    static isCooperMsg(msg) {
        return this.isCooper(msg.author.id);
    }

    static async getIntro(member) {
        const query = {
            name: "get-user-intro",
            text: "SELECT intro_link, intro_time FROM users WHERE discord_id = $1",
            values: [member.user.id]
        };
        return await Database.query(query);
    }
    
}