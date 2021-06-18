import { STATE, TIME } from "../../origin/coop";
import Database from "../../origin/setup/database";
import DatabaseHelper from "../databaseHelper";


export default class TempAccessCodeHelper {

    static expiry = 60 * 5;

    // Delete all access codes for a certain user (heavy-handed/overkill for security/safety).
    static delete(discord_id) {
        return Database.query({
            text: `DELETE FROM temp_login_codes WHERE discord_id = $1`,
            values: [discord_id]
        });
    }

    static async validate(code) {
        // Check code is correct
        console.log('validating cooper dm code', code)

        const result = await DatabaseHelper.singleQuery({
            text: `SELECT * FROM temp_login_codes WHERE code = $1`,
            values: [code]
        });

        console.log('validation resu;t');
        console.log(result);

        if (result) {

            // Check it has not expired
            // if (result) ...
            return result;
        }




        // Validate: Return true/false.
        return false;
    }

    static async create(discord_id) {
        const code = STATE.CHANCE.string({ length: 50, pool: process.env.DISCORD_TOKEN });
        const expiry = TIME._secs() + this.expiry;

        try {
            const result = await Database.query({
                text: `INSERT INTO temp_login_codes (discord_id, code, expires_at) 
                    VALUES ($1, $2, $3)`,
                values: [discord_id, code, expiry]
            });
            console.log(result);
            
        } catch(e) {
            console.log('Error creating temp login code.')
            console.error(e);
        }

        return code;
    }
}