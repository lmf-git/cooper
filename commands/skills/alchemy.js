import DropTable from '../../operations/minigames/medium/economy/items/droptable';

import CoopCommand from '../../operations/activity/messages/coopCommand';
import COOP, { USABLE, SERVER, TIME } from '../../origin/coop';

export default class AlchemyCommand extends CoopCommand {

	constructor(client) {
		super(client, {
			name: 'alchemy',
			group: 'skills',
			memberName: 'alchemy',
			aliases: ['alc'],
			description: 'Alchemise various eggs, we\'re not yolking.',
			details: ``,
			examples: ['alchemy', '!alchemy 100 RARE_EGG'],
			args: [
				{
					key: 'itemCode',
					prompt: 'Which rarity? (item_code)',
					type: 'string',
					default: 'AVERAGE_EGG'
				},
				{
					key: 'qty',
					prompt: 'How many eggs?',
					type: 'integer',
					default: 100
				},
			],
		});
	}

	async run(msg, { qty, itemCode }) {
		super.run(msg);

		const alcQty = Math.round(parseInt(qty) / 100);

		if (!alcQty || alcQty < 1) 
			return COOP.MESSAGES.selfDestruct(msg, 'At least 100 required.')

		let rarity = null;
		itemCode = COOP.ITEMS.parseFromStr(itemCode);
		if (itemCode === 'AVERAGE_EGG') rarity = 'AVERAGE';
		if (itemCode === 'RARE_EGG') rarity = 'RARE';
		if (itemCode === 'LEGENDARY_EGG') rarity = 'LEGENDARY';

		if (!rarity) 
			return COOP.MESSAGES.selfDestruct(msg, 'Invalid item identifier.')

			
		// Calculate the alchemy reward.
		const drop = DropTable.getRandomTieredWithQty(rarity);
		const rewardQty = drop.qty * alcQty;

		// Take the ingredients from the user.
		const didUse = await USABLE.use(msg.author.id, itemCode, qty);
		if (!didUse)
			return COOP.MESSAGES.selfDestruct(msg, 'Not enough eggs.')

		// Add item to the user.
		await COOP.ITEMS.add(msg.author.id, drop.item, rewardQty);

		// Present feedback text/msg.
		const emoji = COOP.MESSAGES._displayEmojiCode(drop.item);
		const actionText = `${msg.author.username} alchemises ${emoji}`;
		const dropText = actionText + `x${rewardQty}`;

		return COOP.CHANNELS.propagate(msg, dropText, 'ACTIONS');
    }
    
};