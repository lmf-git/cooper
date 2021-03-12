import ROLES from '../../config/roles.json';
import ServerHelper from '../server/serverHelper';
import UsersHelper from '../users/usersHelper';

export default class RolesHelper {
    static getRoles(guild, rolesSelection) {
        return guild.roles.cache.filter(r => rolesSelection.includes(r.name));
    }
    static getRolesByID(guild, rolesSelection) {
        return guild.roles.cache.filter(r => rolesSelection.includes(r.id));
    }
    static getRoleByID(guild, roleID) {
        return guild.roles.cache.get(roleID);
    }

    static async _add(userID, roleCode) {
        try {
            const guild = ServerHelper._coop();
            const role = this.getRoleByID(guild, ROLES[roleCode].id);
            const member = UsersHelper._getMemberByID(userID);

            console.log(role.name, member.id);
            // 727311131705868299 COMMANDER
            // 723676356818239773 LEADER

            if (role && member) {
                const roleActionResult = await member.roles.add(role);
                return roleActionResult
            } else {
                // Should throw error?
                return false;
            }
        } catch(e) {
            console.log('Error adding role');
            console.error(e);
        }

    }

    static async toggle(userID, roleCode) {
        try {
            const member = UsersHelper._getMemberByID(userID);

            console.log('Toggling role ' + roleCode);

            if (!member) return false;
            if (!Object.keys(ROLES).includes(roleCode)) return false;
    
            // Check if user has it or not.
            const hasRoleAlready = UsersHelper.hasRoleID(member, ROLES[roleCode].id);
            if (!hasRoleAlready) await this._add(userID, roleCode);
            else await this._remove(userID, roleCode);
            return true;

        } catch(e) {
            console.log('Error with toggle role ' + roleCode);
            console.error(e);
        }
    }

    static async _remove(userID, roleCode) {
        try {
            const guild = ServerHelper._coop();
            const role = this.getRoleByID(guild, ROLES[roleCode].id);
            const user = UsersHelper._getMemberByID(userID);
            if (role && user) return await user.roles.remove(role);
        } catch(e) {
            console.log('Error removing role');
            console.error(e);
        }
        // 723676356818239773 LEADER
    }

    static addRoleCodeToUserID(userID, roleCode) {

    }

    static _has(member, roleCode) {
        const roleID = ROLES[roleCode].id;
        return member.roles.cache.has(roleID);
    }

    static _getUsersWithRoleCodes(roleCodes) {
        const guild = ServerHelper._coop();
        return guild.members.cache.filter(member => {
            let match = false;

            // Test if they have any role codes.
            roleCodes.forEach(roleCode => {
                const roleID = ROLES[roleCode].id;
                if (member.roles.cache.has(roleID)) match = true;
            });

            return match;
        });
    }

    static _getUserWithCode(code) {
        let user = null;

        const guild = ServerHelper._coop();
        const roleID = ROLES[code].id || null;

        const filterUsers = guild.members.cache.filter(member => member.roles.cache.has(roleID));
        if (filterUsers.size > 0) user = filterUsers.first();

        return user;
    }
}