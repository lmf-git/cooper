import ChannelsHelper from "../../../core/entities/channels/channelsHelper";
import DatabaseHelper from "../../../core/entities/databaseHelper";
import MessagesHelper from "../../../core/entities/messages/messagesHelper";
import Database from "../../../core/setup/database";
import ItemsHelper from "../items/itemsHelper";

export default class TradeHelper {

    static async remove(tradeID) {
        const query = {
            name: "remove-trade-id",
            text: `DELETE FROM open_trades WHERE id = $1`,
            values: [tradeID]
        };

        const result = await Database.query(query);
        return result;
    }

    static async all() {
        const query = {
            name: "get-all-trades",
            text: `SELECT * FROM open_trades`
        };

        const result = await Database.query(query);
        return DatabaseHelper.many(result);
    }

    static async create(userID, username, offerItem, receiveItem, offerQty, receiveQty) {
        const query = {
            name: "create-trade",
            text: `INSERT INTO open_trades(trader_id, trader_username, offer_item, receive_item, offer_qty, receive_qty) 
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            values: [userID, username, offerItem, receiveItem, offerQty, receiveQty]
        };
        const result = DatabaseHelper.single(await Database.query(query));

        let tradeID = null;
        if (typeof result.id !== 'undefined') tradeID = result.id;

        return tradeID;
    }

    // Reverse the search order (inversion of give versus take).
    static async find(offerItem, receiveItem, offerQty, receiveQty) {
        // Find the cheapest match
        // const match = DatabaseHelper.single()
    }

    static async findOfferMatches(offerItem) {
        const query = {
            name: "get-trades-by-offer",
            text: `SELECT * FROM open_trades WHERE offer_item = $1`,
            values: [offerItem]
        };

        const result = await Database.query(query);
        return DatabaseHelper.many(result);
    }

    static async findReceiveMatches(receiveItem) {
        const query = {
            name: "get-trades-by-offer",
            text: `SELECT * FROM open_trades WHERE receive_item = $1`,
            values: [receiveItem]
        };

        const result = await Database.query(query);
        return DatabaseHelper.many(result);
    }

    static async findOfferReceiveMatches(offerItem, receiveItem) {
        const query = {
            name: "get-trades-by-offer-receive",
            text: `SELECT * FROM open_trades WHERE offer_item = $1 AND receive_item = $2`,
            values: [offerItem, receiveItem]
        };

        const result = await Database.query(query);
        return DatabaseHelper.many(result);
    }

    static async matches(offerItem, receiveItem, offerQty, receiveQty) {
        const query = {
            name: "get-trades-by-offer-receive-qty",
            text: `SELECT * FROM open_trades 
                WHERE offer_item = $1 AND receive_item = $2 AND offer_qty = $3 AND receive_qty <= $4`,
            values: [offerItem, receiveItem, offerQty, receiveQty]
        };

        const result = await Database.query(query);
        return DatabaseHelper.many(result);
    }

    static async listMatch(offerItem, receiveItem) {
        const query = {
            name: "get-matches-of-type",
            text: `SELECT * FROM open_trades WHERE offer_item = $1 and receive_item = $2`,
            values: [offerItem, receiveItem]
        };
        
        const result = await Database.query(query);
        return DatabaseHelper.many(result);
    }

    static async get(tradeID) {
        const query = {
            name: "get-open-trade-id",
            text: `SELECT * FROM open_trades WHERE id = $1`,
            values: [tradeID]
        };
        
        const result = await Database.query(query);
        return DatabaseHelper.single(result);
    }

    // This method directly takes items from user to close a trade.
    static async accept(openTradeID, accepteeID, accepteeName) {
        try {
            // Get trade by ID
            const trade = await this.get(openTradeID);

            // Trade may have been removed before accept.
            if (trade) {
                // Try to use/fulfil the trade.
                const didUse = await ItemsHelper.use(accepteeID, trade.receive_item, trade.receive_qty);
                if (didUse) {
                    // Add the offer items to the acceptee.
                    await ItemsHelper.add(accepteeID, trade.offer_item, trade.offer_qty);
    
                    // Add the receive items to the trader.
                    await ItemsHelper.add(trade.trader_id, trade.receive_item, trade.receive_qty);
    
                    // Delete/close the open trade offer.
                    await this.remove(openTradeID);
    
                    // Build string for logging/feedback.
                    const tradeAwayStr = `${MessagesHelper._displayEmojiCode(trade.offer_item)}x${trade.offer_qty}`;
                    const receiveBackStr = `${MessagesHelper._displayEmojiCode(trade.receive_item)}x${trade.receive_qty}`;
                    const exchangeString = `<- ${tradeAwayStr}\n-> ${receiveBackStr}`;
                    const tradeConfirmStr = `**${accepteeName} accepted trade #${trade.id} from ${trade.trader_username}**\n\n` +
                        exchangeString;
                                        
                    // Log confirmed trades
                    ChannelsHelper._postToChannelCode('ACTIONS', tradeConfirmStr, 999);

                    // Return successful result.
                    return true;
                }
            }
        } catch(e) {
            console.log('Error accepting trade offer.');
            console.error(e);
        }        
        return false;
    }

}