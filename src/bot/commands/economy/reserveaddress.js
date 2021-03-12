import ReservesHelper from '../../community/features/economy/reservesHelper';
import CoopCommand from '../../core/entities/coopCommand';
import MessagesHelper from '../../core/entities/messages/messagesHelper';

export default class ReserveAddressCommand extends CoopCommand {

	constructor(client) {
		super(client, {
			name: 'reserveaddress',
			group: 'economy',
			memberName: 'reserveaddress',
			aliases: ['resadd', 'resaddr'],
			description: 'This command lets you reserveaddress the items you own',
			details: `Details of the reserveaddress command`,
			examples: ['reserveaddress', '!reserveaddress laxative']
		});
	}

	async run(msg) {
		super.run(msg);

		// State addresses for reserve wallets.
        const address = await ReservesHelper.address();
		MessagesHelper.selfDestruct(msg, `**Reserves' Wallet Address:**\n${address}`);
    }
    
};