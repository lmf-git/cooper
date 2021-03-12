import ChannelsHelper from "../channels/channelsHelper";
import ServerHelper from "../server/serverHelper";
import EMOJIS from "../../config/emojis.json";

export default class MessagesHelper {

    static parselink(link) {
        let result = null;

        // Remove domains.
        let subjStr = link.replace('https://discordapp.com/channels/', '');
        subjStr = subjStr.replace('https://discord.com/channels/', '');

        const msgPcs = subjStr.split('/');

        const data = {
            guild: msgPcs[0],
            channel: msgPcs[1],
            message: msgPcs[2]
        };
        
        result = data;

        return result;
    }
    
    static link(msg) {
        const link = `https://discordapp.com/channels/` +
            `${msg.guild.id}/` +
            `${msg.channel.id}/` +
            `${msg.id}`;
        return link;
    }

    static async deleteByLink(link) {
        const data = this.parselink(link);
        const coop = ServerHelper._coop();
        const chan = coop.channels.cache.get(data.channel);
        const message = await chan.messages.fetch(data.message);
        return message.delete();
    }

    static noWhiteSpace(strings, ...placeholders) {
        // Build the string as normal, combining all the strings and placeholders:
        let withSpace = strings.reduce((result, string, i) => (result + placeholders[i - 1] + string));
        let withoutSpace = withSpace.replace(/\s\s+/g, ' ');
        return withoutSpace;
    }
    static removeSymbols(str) {
        return str.replace('>', '').replace('<', '');
    }
    static getEmojiIdentifier(msg) {
        return this.removeSymbols(msg.content.trim());
    }

    static isOnlyEmojis(text) {
        const onlyEmojis = text.replace(new RegExp('[\u0000-\u1eeff]', 'g'), '');
        const visibleChars = text.replace(new RegExp('[\n\r\s]+|( )+', 'g'), '');
        return onlyEmojis.length === visibleChars.length;
    }

    static isOnlyEmojisOrIDs(text) {
        const codeChars = text.replace(new RegExp(':\w+:', 'g'), '')
        const visibleChars = text.replace(new RegExp('[\n\r\s]+|( )+', 'g'), '')
        const isOnlyIDCodes = codeChars.length === visibleChars.length;
        return this.isOnlyEmojis(text) || isOnlyIDCodes;
    }

    static countAllEmojiCodes(text) {
        const numCodes = text.match(/(:\w+:)/gm).length;
        return numCodes;
    }

    static emojiToUni(emoji) {
        return emoji.codePointAt(0).toString(16);
    }


    // Handles :single: and :double: id emoji input
    // Not sure about emoji direct unicode (image char)
    static _displayEmojiCode(code) {
        let displayStr = '?';

        const emoji = EMOJIS[code];
        if (emoji) displayStr = this.emojiText(emoji);

        return displayStr;
    }
    static emojiText(emoji) {
        // const numColons = emoji.split(":").length - 1;
        const truePieces = emoji.split(':').filter(piece => piece !== '');
        if (truePieces.length === 1) return emoji;
        return `<${emoji}>`;
    }

    static delayReactionRemove(reaction, delay) {
        if (reaction) setTimeout(() => { reaction.remove(); }, delay);
    }

    static delayReactionRemoveUser(reaction, userID, delay) {
        setTimeout(() => reaction.users.remove(userID), delay);
    }

    static delayReact(msg, emoji, delay = 666) {
        setTimeout(() => { 
            if (typeof msg.react === 'function') 
                msg.react(emoji)
                    .then()
                    .catch(e => {
                        console.log('Delay react error.');
                        console.error(e);
                    });
        }, delay);
    }

    static delayDelete(msg, delay = 666) {
        if (msg) setTimeout(async () => { 
            try {
                if (typeof msg.delete === 'function') await msg.delete();
                else console.log('Logging msg.delete not function', msg);
            } catch(e) {
                console.log('Delay delete error.');
                // console.error(e);
            }
        }, delay);
    }

    static delayEdit(msg, newContent, delay = 666) {
        if (msg) setTimeout(async () => { 
            try {
                await msg.edit(newContent);
            } catch(e) {
                console.log('Delay edit error.');
                console.error(e);
            }
        }, delay);
    }

    static selfDestruct(msgRef, content, delay = 666, fuse = 30000) {
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    const createdMsg = await msgRef.say(content);
                    this.delayDelete(createdMsg, fuse);
                    resolve(createdMsg);
                } catch(e) {
                    console.log('Error self-destructing message.');
                    console.error(e);
                    reject('self_destruct_message_error');
                }
            }, delay);
        });
    }

    // Convert emojiID into Discord format, but not if its merely an unicode emoji.
    static emojifyID = emojiID => {
        if (emojiID) {
            const idParts = emojiID.split(':');
            if (idParts.length > 1) return idParts[2].length > 1 ? `<${emojiID}>` : emojiID;
        }
        return '_' + emojiID;
    }

    static itemCodeFromMisc(miscString) {
        
    }

    static titleCase = (str) => {
        str = str.toLowerCase().split(' ');
        for (let i = 0; i < str.length; i++) str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1); 
        return str.join(' ');
    }

    static async getByLink(link) {
        let msg = null;
        
        try {
            const msgData = this.parselink(link);
            const channel = ChannelsHelper._get(msgData.channel);
            const fetchedMsg = await channel.messages.fetch(msgData.message);
            if (fetchedMsg) msg = fetchedMsg;
            return msg;

        } catch(e) {
            return msg;
        }
    }

    static async editByLink(link, content) {
        try {
            const msg = await this.getByLink(link);
            const editedMsg = await msg.edit(content);
            return editedMsg;
        } catch(e) {
            console.log('Error editing message by link');
            console.error(e);
        }
    }

    static randomChars(qty) {
        const characters = 'abcdefghijklmnopqrstuvwxyz';
        let result = '';
        for ( let i = 0; i < qty; i++ ) {
            const randIndex = Math.floor(Math.random() * characters.length);
            result += characters.charAt(randIndex);
        }
        return result;
    }

    static async preloadMsgLinks(messageLinks = []) {
        return await Promise.all(messageLinks.map((link, index) => {
            const channelCache = (ServerHelper._coop()).channels.cache;
            return new Promise((resolve, reject) => {
                setTimeout(async () => {
                    const entityIDs = MessagesHelper.parselink(link);
                    const chan = channelCache.get(entityIDs.channel);
                    if (chan) {
                        const msg = await chan.messages.fetch(entityIDs.message);
                        resolve(msg);
                    }
                    resolve(null);
                }, 666 * index);
            });
        }));
    }

    static async getReactionType(message, type) {
        
    }

}