# Cooper (The Coop's Discord Bot)
https://docs.google.com/document/d/1nmZARuG1FRNW4sibJU0k2BleP5KTcKurBa-Uul7lCf4/edit?usp=sharing


TODO: Clean this README up.







<!-- Access database -->
heroku pg:psql --app cooperchickenbot





<!-- Schema -->


CREATE TABLE open_trades(
    id SERIAL PRIMARY KEY,
    trader_id VARCHAR,
    trader_username VARCHAR,
    offer_item VARCHAR,
    receive_item VARCHAR,
    offer_qty int,
    receive_qty int
);

CREATE TABLE items(
    id SERIAL PRIMARY KEY,
    item_code VARCHAR,
    quantity int,
    owner_id VARCHAR,
    CONSTRAINT fk_owner_id
        FOREIGN KEY(owner_id) 
        REFERENCES users(discord_id)
        ON DELETE CASCADE
);

CREATE TABLE election_votes(
    id SERIAL PRIMARY KEY,
    candidate_id VARCHAR,
    voter_id VARCHAR,
    time int,
    CONSTRAINT fk_voter_id
        FOREIGN KEY(voter_id) 
        REFERENCES users(discord_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_candidate_id
        FOREIGN KEY(candidate_id) 
        REFERENCES users(discord_id)
        ON DELETE CASCADE
);


CREATE TABLE candidates(
    id SERIAL PRIMARY KEY,
    campaign_msg_link VARCHAR,
    candidate_id VARCHAR,
    CONSTRAINT fk_candidate_id
        FOREIGN KEY(candidate_id) 
        REFERENCES users(discord_id)
        ON DELETE CASCADE
);

CREATE TABLE past_commanders(
    id SERIAL PRIMARY KEY,
    last_served int,
    candidate_id VARCHAR,
    CONSTRAINT fk_candidate_id
        FOREIGN KEY(candidate_id) 
        REFERENCES users(discord_id)
        ON DELETE CASCADE
);


CREATE TABLE structures(
    id SERIAL PRIMARY KEY,
    structure_code VARCHAR,
    health int,
    level int,
    owner_id VARCHAR,
    CONSTRAINT fk_owner_id
        FOREIGN KEY(owner_id) 
        REFERENCES users(discord_id)
        ON DELETE CASCADE
);

CREATE TABLE skills(
    id SERIAL PRIMARY KEY,
    crafting int,
    magic int,
    mining int,
    woodcutting int,
    fishing int,
    hunting int,
    player_id VARCHAR,
    CONSTRAINT fk_player_id
        FOREIGN KEY(player_id) 
        REFERENCES users(discord_id)
        ON DELETE CASCADE
);


CREATE TABLE events(
    id SERIAL PRIMARY KEY,
    event_code VARCHAR UNIQUE NOT NULL,
    last_occurred bigint
);


CREATE TABLE chicken(
    id SERIAL PRIMARY KEY,
    attribute VARCHAR UNIQUE NOT NULL,
    value VARCHAR
);


<!-- Useful forced actions -->
ALTER TABLE users
    ADD COLUMN email VARCHAR;



CREATE TABLE temp_messages(
    id SERIAL PRIMARY KEY,
    message_id VARCHAR,
    expiry_time int
);

ALTER TABLE temp_messages
    ADD COLUMN message_link VARCHAR;
    
ALTER TABLE temp_messages
    DROP COLUMN message_id;
