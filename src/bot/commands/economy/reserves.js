import ReservesHelper from '../../community/features/economy/reservesHelper';
import CoopCommand from '../../core/entities/coopCommand';
import MessagesHelper from '../../core/entities/messages/messagesHelper';

export default class ReservesCommand extends CoopCommand {

	constructor(client) {
		super(client, {
			name: 'reserves',
			group: 'economy',
			memberName: 'reserves',
			aliases: ['res'],
			description: 'This command lets you reserves the items you own',
			details: `Details of the reserves command`,
			examples: ['reserves', '!reserves laxative']
		});
	}

	async run(msg) {
		super.run(msg);

		// TODO: This should be updated in an economy channel somewhere.
		// TODO: Notify community with over 10% change to reserves.
		MessagesHelper.selfDestruct(
			msg, 
			`**Economy Reserves:**\n${await ReservesHelper.balanceText()}`
		);
    }
    
};