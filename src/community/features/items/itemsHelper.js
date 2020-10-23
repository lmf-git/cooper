import Database from "../../../bot/core/setup/database";

export default class ItemsHelper {

    static emojiCodeToItemCode(emojiCode) {
        return 'test';
    }

    static async add(userID, item_code, quantity) {
        const query = {
            name: "add-item",
            text: `INSERT INTO "items"(owner_id, item_code, quantity)
                VALUES($1, $2, $3) 
                ON CONFLICT (owner_id, item_code)
                DO 
                UPDATE SET quantity = items.quantity + EXCLUDED.quantity`,
            values: [userID, item_code, quantity]
        };
        return await Database.query(query);
    }

    static async getUserItem(userID, itemCode) {}
    
    static async getUserItems(userID) {
        const query = {
            name: "get-all-user-items",
            text: `SELECT * FROM "items" WHERE owner_id = $1`,
            values: [userID]
        };
        return await Database.query(query);
    }

    static async subtract(member) {
        // If item count goes to zero, remove it
        const query = {
            name: "subtract-item",
            text: "DELETE FROM items WHERE discord_id = $1",
            values: [member.item.id]
        };
        return await Database.query(query);
    }

    static async create(member) {
        const query = {
            name: "add-item",
            text: "DELETE FROM items WHERE discord_id = $1",
            values: [member.item.id]
        };
        return await Database.query(query);
    }

    static async read(member, itemCode) {
        const query = {
            name: "read-item",
            text: "DELETE FROM items WHERE discord_id = $1",
            values: [member.item.id]
        };
        return await Database.query(query);
    }

    static async update(member, itemCode, quantity) {
        const query = {
            name: "update-item",
            text: "DELETE FROM items WHERE discord_id = $1",
            values: [member.item.id]
        };
        return await Database.query(query);
    }

    static async delete(member, itemCode) {
        const query = {
            name: "delete-item",
            text: "DELETE FROM items WHERE discord_id = $1",
            values: [member.item.id]
        };
        return await Database.query(query);
    }

    static formItemDropText(user, items) {
        let itemDisplayMsg = `${user.username}'s items:`;
        items.rows.forEach(item => {
            const emojiIcon = MessagesHelper.emojifyID(EMOJIS[item.item_code]);
            const itemText = `\n${emojiIcon} (${item.item_code}) x ${item.quantity}`;
            itemDisplayMsg += itemText;
        })
        return itemDisplayMsg
    }

    static dropItem() {}
    static dropItems() {}
   
}