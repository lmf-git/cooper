import STATE from "../../../state";

import DatabaseHelper from "../databaseHelper";
import Database from "../../setup/database";
import ServerHelper from "../server/serverHelper";

import ROLES from '../../config/roles.json';

export default class UsersHelper {
    static avatar(user) {
        const avatarURL = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
        return avatarURL;
    }

    static _cache() {
        return ServerHelper._coop().members.cache;
    }

    static _get = this._getMemberByID;
    static _getMemberByID(id) {
        return this._cache().get(id);
    }

    static getMemberByID = (guild, id) => guild.members.cache.get(id);

    static fetchMemberByID = (guild, id) => guild.members.fetch(id);

    static hasRoleID = (member, id) => {
        return member.roles.cache.get(id);
    }

    static hasRoleIDs = (guild, member, roleIDs) => 
        guild.roles.cache
            .filter(role => roleIDs.includes(role.id))
            .some(role => member.roles.cache.has(role.id));

    static hasRoleNames = (guild, member, roleNames) => 
        guild.roles.cache
            .filter(role => roleNames.includes(role.name))
            .some(role => member.roles.cache.has(role.id));

    // TODO: Refactor since fragments were turned off, this becomes a bit weirder/easier.
    static count(guild, includeBots = false) {
        return guild.memberCount;
    }

    static directMSG = (guild, userID, msg) => {
        const member = UsersHelper.getMemberByID(guild, userID);
        if (member) member.send(msg);
    };

    static _dm(userID, msg) {
        const guild = ServerHelper._coop();
        this.directMSG(guild, userID, msg);
    }

    static getOnlineMembers = (guild) => guild.members.cache.filter(member => member.presence.status === 'online');
    
    static filterMembers = (guild, filter) => guild.members.cache.filter(filter);

    static _filter = filter => ServerHelper._coop().members.cache.filter(filter);

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
        let users = [];
        const query = {
            name: "get-users",
            text: "SELECT * FROM users"
        };
        const result = await Database.query(query);        
        if (result) users = result.rows;
        return users;
    }

    static async updateField(id, field, value) {
        const query = {
            text: `UPDATE users SET ${field} = $1 WHERE discord_id = $2`,
            values: [value, id]
        };
        return await Database.query(query);
    }
    
    static async loadSingle(id) {
        const query = {
            name: "get-user",
            text: "SELECT * FROM users WHERE discord_id = $1",
            values: [id]
        };

        const result = await Database.query(query);
        return DatabaseHelper.single(result);
    }

    static async random() {
        const membersManager = ServerHelper._coop().members;
        const randomUser = await this._random();
        const member = await membersManager.fetch(randomUser.discord_id);
        return member;
    }

    static async _random() {
        const query = {
            name: "get-random-user",
            text: "SELECT * FROM users LIMIT 1 OFFSET floor(random() * (SELECT count(*) from users))"
        };
        const result = DatabaseHelper.single(await Database.query(query));
        return result;
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
        
        const result = await Database.query(query);
        return DatabaseHelper.single(result);
    }
    
    static async getLastUser() {
        const query = {
            name: "get-last-user",
            text: "SELECT * FROM users WHERE id = (select max(id) from users)"
        };
        const result = await Database.query(query);
        return DatabaseHelper.single(result);
    }

    static getHierarchy() {
        const guild = ServerHelper._coop();
        return {
            commander: this.getMembersByRoleID(guild, ROLES.COMMANDER.id).first(),
            leaders: this.getMembersByRoleID(guild, ROLES.LEADER.id),
            memberCount: guild.memberCount
        };
    }

    static async cleanupUsers() {
        const allUsers = await this.load();
        allUsers.map((user, index) => {
            const member = this._getMemberByID(user.discord_id);
            if (!member) setTimeout(() => this.removeFromDatabase({
                user: {
                    id: user.discord_id
                }
            }), 666 * index);
        });
    }

}