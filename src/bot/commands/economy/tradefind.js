import TradeHelper from '../../community/features/economy/tradeHelper';
import ItemsHelper from '../../community/features/items/itemsHelper';
import CoopCommand from '../../core/entities/coopCommand';
import MessagesHelper from '../../core/entities/messages/messagesHelper';

export default class TradeFindCommand extends CoopCommand {

	constructor(client) {
		super(client, {
			name: 'tradefind',
			group: 'economy',
			memberName: 'tradefind',
			aliases: ['findtr'],
			description: 'This command lets you find the trades you want',
			details: `Details of the tradefind command`,
			examples: ['tradefind', '!tradefind laxative'],
			args: [
				{
					key: 'offerItemCode',
					prompt: 'Which item_code are you offering?',
					type: 'string'
				},
				{
					key: 'receiveItemCode',
					prompt: 'Which item_code should you receive?',
					type: 'string',
					default: ''
				}
			],
		});
	}

	async run(msg, { offerItemCode, receiveItemCode }) {
		super.run(msg);

		offerItemCode = ItemsHelper.parseFromStr(offerItemCode);
		receiveItemCode = ItemsHelper.parseFromStr(receiveItemCode);

		// If receive item code has been given, make sure only those matching returned.
		if (receiveItemCode && receiveItemCode !== '') {
			// If both items given, list only those matching.
			const matches = await TradeHelper.findOfferReceiveMatches(offerItemCode, receiveItemCode);
			
			if (matches.length === 0) return MessagesHelper.selfDestruct(msg, 
				`No existing trades exchanging ${offerItemCode} for ${receiveItemCode}`);

			console.log(matches);

		} else {
			// If only offer item given, list all of that type.
			const types = await TradeHelper.findReceiveMatches(offerItemCode);

			if (matches.length === 0) return MessagesHelper.selfDestruct(msg, 
				`No existing trades offering ${offerItemCode}`);

			// TODO: Format and present the matches if they exist.

			console.log(types);
		}

    }
    
};