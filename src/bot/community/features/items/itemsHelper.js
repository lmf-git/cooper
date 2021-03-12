import MessagesHelper from "../../../core/entities/messages/messagesHelper";
import Database from "../../../core/setup/database";

import EMOJIS from '../../../core/config/emojis.json';
import DatabaseHelper from "../../../core/entities/databaseHelper";

// Items with reaction usages.
import BombHandler from "./handlers/bombHandler";
import ToxicEggHandler from "./handlers/toxicEggHandler";
import AverageEggHandler from "./handlers/averageEggHandler";
import RareEggHandler from "./handlers/rareEggHandler";
import LegendaryEggHandler from "./handlers/legendaryEggHandler";
import DiamondHandler from "./handlers/diamondHandler";


export default class ItemsHelper {

    static async onReaction(reaction, user) {
        BombHandler.onReaction(reaction, user);
        ToxicEggHandler.onReaction(reaction, user);
        AverageEggHandler.onReaction(reaction, user);
        RareEggHandler.onReaction(reaction, user);
        LegendaryEggHandler.onReaction(reaction, user);
        DiamondHandler.onReaction(reaction, user);
    }

    static async add(userID, item_code, quantity) {
        const query = {
            name: "add-item",
            text: `INSERT INTO items(owner_id, item_code, quantity)
                VALUES($1, $2, $3) 
                ON CONFLICT (owner_id, item_code)
                DO 
                UPDATE SET quantity = items.quantity + EXCLUDED.quantity
                RETURNING quantity`,
            values: [userID, item_code, quantity]
        };
        
        const result = await Database.query(query);
        const newQty = (result.rows[0] || { quantity: 0 }).quantity;
        return newQty;
    }

    static async subtract(userID, itemCode, subQuantity) {
        // If item count goes to zero, remove it
        const query = {
            name: "subtract-item",
            text: `UPDATE items 
                SET quantity = quantity - $3 WHERE owner_id = $1 AND item_code = $2
                RETURNING quantity`,
            values: [userID, itemCode, subQuantity]
        };
        const updateResult = await Database.query(query);

        // Remove if zero
        if (updateResult.rowCount > 0) {
            const updatedQty = updateResult.rows[0].quantity || 0;
            if (updatedQty <= 0) await this.delete(userID, itemCode);
        }

        return updateResult;
    }

    static async getUserItem(userID, itemCode) {
        const query = {
            name: "get-user-item",
            text: `SELECT * FROM "items" WHERE owner_id = $1 AND item_code = $2`,
            values: [userID, itemCode]
        };
        return DatabaseHelper.single(await Database.query(query));
    }

    static async getUserItemQty(userID, itemCode) {
        let qty = 0;
        const userItem = await this.getUserItem(userID, itemCode);
        if (userItem) qty = userItem.quantity || 0;
        return qty;
    }

    static async hasQty(userID, itemCode, qty) {
        const hasQty = await this.getUserItemQty(userID, itemCode);
        return (hasQty => qty);
    }
    
    static async getUserItems(userID) {
        const query = {
            name: "get-all-user-items",
            text: `SELECT * FROM "items" WHERE owner_id = $1`,
            values: [userID]
        };

        return DatabaseHelper.many(await Database.query(query));
    }

    static async count(itemCode) {
        const query = {
            name: "count-item",
            text: "SELECT SUM(quantity) FROM items WHERE item_code = $1",
            values: [itemCode]
        };

        const result = DatabaseHelper.single(await Database.query(query));
        const count = result.sum || 0;

        return count;
    }

    static async read(userID, itemCode) {
        const query = {
            name: "read-item",
            text: "SELECT * FROM items WHERE owner_id = $1 AND item_code = $2",
            values: [userID, itemCode]
        };
        return await Database.query(query);
    }

    static async update(userID, itemCode, quantity) {
        const query = {
            name: "update-item",
            text: `UPDATE items SET quantity = $3 
                WHERE owner_id = $1 AND item_code = $2`,
            values: [userID, itemCode, quantity]
        };
        return await Database.query(query);
    }

    static async delete(userID, itemCode) {
        const query = {
            name: "delete-item",
            text: "DELETE FROM items WHERE owner_id = $1 AND item_code = $2",
            values: [userID, itemCode]
        };
        return await Database.query(query);
    }
    
    static formItemDropText(user, items) {
        let itemDisplayMsg = `${user.username}'s items:`;
        items.forEach(item => {
            const emojiIcon = MessagesHelper.emojifyID(EMOJIS[item.item_code]);
            const itemText = `\n${emojiIcon} (${item.item_code}) x ${item.quantity}`;
            itemDisplayMsg += itemText;
        })
        return itemDisplayMsg
    }

    static async use(userID, itemCode, useQty) {
        // Attempt to load item ownership.
        const ownedQty = await this.getUserItemQty(userID, itemCode);

        // Check if enough qty of item is owned.
        if (ownedQty - useQty >= 0) {
            await this.subtract(userID, itemCode, useQty);
            return true;
        } else return false;
    }

    static dropItem() {}
    
    static dropItems() {}
 
    static isUsable(itemCode) {
		return this.getUsableItems().includes(itemCode);
    }

    static parseFromStr(str) {
        let match = null;
        const usables = this.getUsableItems();
        const key = str.trim().replace(' ', '_').toUpperCase();
        usables.map(usable => {
            if (usable === key) match = usable;
        });
        return match;
    }

    static getUsableItems() {
        const unusable = this.NON_USABLE_EMOJIS;
        const codeFilter = itemCode => !unusable.includes(itemCode);
        return Object.keys(EMOJIS).filter(codeFilter);
    }

    //Input Takes a string and extracts the items mentioned in it. Returns an array containing the item codes. The search is greedy so will extrct the longest possible name
    static parseItemCodes(inputString) {
        // Remove multiple spaces and make uppercase
        const str = inputString.replace(/\s\s+/g, ' ').toUpperCase();

        const usableItemsStr = ItemsHelper.getUsableItems();

        // Generate The regex to match the items. This is only done once to save server time
        const matchRegex = new RegExp("(" + usableItemsStr.join("|").replace("_", "[_\\s]") + ")", 'g');

        // Match with the regex. This returns an array of the found matches
        const matches = str.match(matchRegex);

        // Return matches as canonical item codes
        return matches.map(x => x.replace(/\s/g, '_'));
    }

    static beautifyItemCode(Code) {
        const LowerName = Code.replace("_", " ").toLowerCase();
        const nameCapitalized = LowerName.charAt(0).toUpperCase() + LowerName.slice(1);
        const emoji = MessagesHelper.emojifyID(EMOJIS[Code]);
        return nameCapitalized + " " + emoji;
    }

    static async getUserWithItem(itemCode) {
        const query = {
            name: "get-user-with-item",
            text: `SELECT * FROM "items" WHERE quantity > 0 AND item_code = $1`,
            values: [itemCode]
        };
        const result = await Database.query(query);
        return DatabaseHelper.single(result);
    }

    static async getUsersWithItem(itemCode) {
        const query = {
            name: "get-users-with-item",
            text: `SELECT * FROM "items" WHERE quantity > 0 AND item_code = $1`,
            values: [itemCode]
        };
        const result = await Database.query(query);
        return DatabaseHelper.many(result);
    }

    static NON_USABLE_EMOJIS = [
        "COOP",
        "VOTE_FOR",
        "VOTE_AGAINST",

        "LEGENDARY_CRATE",
        "LEGENDARY_CRATE_OPEN",
        "RARE_CRATE",
        "RARE_CRATE_OPEN",
        "AVERAGE_CRATE",
        "AVERAGE_CRATE_OPEN",

        "POLL_FOR",
        "POLL_AGAINST",
        "ROADMAP",
        "SACRIFICE_SHIELD",
        "ROCK",

        "DROPPED",
        "BASKET",

        // Maybe usable.
        "DAGGER",
    ];

}