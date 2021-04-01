import SkillsHelper, { SKILLS } from '../../community/features/skills/skillsHelper';
import CoopCommand from '../../core/entities/coopCommand';
import MessagesHelper from '../../core/entities/messages/messagesHelper';


export default class XpCommand extends CoopCommand {

	constructor(client) {
		super(client, {
			name: 'xp',
			group: 'skills',
			memberName: 'xp',
			aliases: [],
			description: 'This command lets you xp the items you want',
			details: `Details of the xp command`,
			examples: ['xp', '!xp laxative'],
			args: [
				{
					key: 'skillCode',
					prompt: 'Which skill to XP check?',
					type: 'string'
				},
			],
		});
	}

	async run(msg, { skillCode }) {
		super.run(msg);

		// Shorthand for feedback.
		const username = msg.author.username;

		try {
			// Check if emoji and handle emoji inputs.
			// skillCode = interpretskillCodeArg(skillCode);
			skillCode = skillCode.toLowerCase();

			if (skillCode === '') {
				// Provide all skills

				const userSkills = await SkillsHelper.getSkills(msg.author.id);

				return MessagesHelper.selfDestruct(msg, 'ALL SKILLS XP 4 u!' + JSON.stringify(userSkills));
			}

			const skillCodeList = Object.keys(SKILLS);
			const isValid = skillCodeList.includes(skillCode.toUpperCase());

			// Check if input is a valid item code.
			if (!isValid)
				return MessagesHelper.selfDestruct(msg, `Invalid skill code ${skillCode}.`);


			// Calculate
			const level = await SkillsHelper.getLevel(skillCode, msg.author.id);
			const xp = await SkillsHelper.getXP(skillCode, msg.author.id);

			const levelText = `${username} has ${xp} ${skillCode} XP (level ${level})!`;
			return MessagesHelper.selfDestruct(msg, levelText);



		} catch(e) {
			console.log('Error getting skill xp.');
			console.error(e);
		}
    }
    
};