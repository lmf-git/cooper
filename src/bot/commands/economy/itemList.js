import ItemsHelper from '../../../bot/community/features/items/itemsHelper';
import CoopCommand from '../../core/entities/coopCommand';
import MessagesHelper from '../../core/entities/messages/messagesHelper';

export default class ItemListCommand extends CoopCommand {

	constructor(client) {
		super(client, {
			name: 'itemlist',
			group: 'economy',
			memberName: 'itemlist',
			aliases: ['il', 'list'],
			description: 'Retrieves a list of usable item codes',
			details: `Details of the itemlist command`,
			examples: ['itemlist', '!itemlist'],
		});
	}

	async run(msg) {
		super.run(msg);

		const usableItems = ItemsHelper.getUsableItems().map((x) => ItemsHelper.beautifyItemCode(x)).join('\n');
		const usableItemsMsgText = `Usable Items: \n ${usableItems}`;
		const listMsg = await msg.say(usableItemsMsgText);

		MessagesHelper.delayDelete(listMsg, 10000);
    }
    
};