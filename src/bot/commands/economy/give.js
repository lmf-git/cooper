import ItemsHelper from '../../../bot/community/features/items/itemsHelper';
import CoopCommand from '../../core/entities/coopCommand';
import ChannelsHelper from '../../core/entities/channels/channelsHelper';
import MessagesHelper from '../../core/entities/messages/messagesHelper';
import ServerHelper from '../../core/entities/server/serverHelper';
import UsersHelper from '../../core/entities/users/usersHelper';
import STATE from '../../state';
import ElectionHelper from '../../community/features/hierarchy/election/electionHelper';

export default class GiveCommand extends CoopCommand {

	constructor(client) {
		super(client, {
			name: 'give',
			group: 'economy',
			memberName: 'give',
			aliases: ['g'],
			description: 'This command lets you give the items you own',
			details: `Details of the give command`,
			examples: ['give', '!give laxative'],
			args: [
				{
					key: 'itemCode',
					prompt: 'What is the code of the item you wish to give? Use !items if not sure',
					type: 'string',
					default: null
				},
				{
					key: 'target',
					prompt: 'Who do you wish to give the item to? @ them.',
					type: 'user',
					default: null
				},
				{
					key: 'qty',
					prompt: 'How many of this item do you want to give?',
					type: 'integer',
					default: 1
				},
			],
		});
	}

	async run(msg, { itemCode, target, qty }) {
		super.run(msg);

		try {
			// TODO: Use a gift basket up on this.

			// Target is first mention

			// Item code is any string as long as valid

			// Qty is 1 unless contains a number and is parsed
			
			itemCode = ItemsHelper.parseFromStr(itemCode);

			// Check if this item code can be given.
			if (!ItemsHelper.isUsable(itemCode) || itemCode === null) 
				return MessagesHelper.selfDestruct(msg, 'Please provide a valid item name  (!give item target [qty]).', 10000);
	
			// Attempt to load target just to check it can be given.
			const guild = ServerHelper.getByCode(STATE.CLIENT, 'PROD');
			const targetMember = UsersHelper.getMemberByID(guild, target.id);
			if (!target || !targetMember)
				return MessagesHelper.selfDestruct(msg, `Gift target is invalid (!give item target [qty]).`, 10000);
	
			// Check if this user owns that item.
			const itemQty = await ItemsHelper.getUserItemQty(msg.author.id, itemCode);
			if (itemQty < 0 || itemQty - qty < 0) 
				return MessagesHelper.selfDestruct(msg, `You do not own enough ${itemCode}. ${itemQty}/${qty}`, 10000);
			
			// Attempt to use item and only grant once returned successful, avoid double gift glitching.
			if (await ItemsHelper.use(msg.author.id, itemCode, qty)) {
				await ItemsHelper.add(target.id, itemCode, qty);
				
				// Intercept the giving of election items.
				if (itemCode === 'LEADERS_SWORD' || itemCode === 'ELECTION_CROWN')
					ElectionHelper.ensureItemSeriousness();

				const addText = `${msg.author.username} gave ${target.username} ${itemCode}x${qty}.`;
				ChannelsHelper.propagate(msg, addText, 'ACTIONS');
			}
		} catch(e) {
			console.log('Failed to give item.');
			console.error(e);
		}
    }
    
};