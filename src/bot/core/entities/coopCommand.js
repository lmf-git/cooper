import { Command } from 'discord.js-commando';

export default class CoopCommand extends Command {

	constructor(client, config) {
		super(client, config);
	}

	async run(msg) {
		// Remove calling command.
		msg.delete();

		// TODO: Log calling command.

		// TODO: Acknowledge first coop-command usage + points/achievements too.
    }
    
};