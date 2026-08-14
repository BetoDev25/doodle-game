-- +goose Up
-- +goose StatementBegin

-- Matches table: allow NULL and SET NULL on delete
ALTER TABLE matches ALTER COLUMN starter_id DROP NOT NULL;
ALTER TABLE matches ALTER COLUMN finisher_id DROP NOT NULL;

ALTER TABLE matches DROP CONSTRAINT matches_starter_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_starter_id_fkey 
    FOREIGN KEY (starter_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE matches DROP CONSTRAINT matches_finisher_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_finisher_id_fkey 
    FOREIGN KEY (finisher_id) REFERENCES users(id) ON DELETE SET NULL;

-- Drawings table: use user_id column
ALTER TABLE drawings ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE drawings DROP CONSTRAINT drawings_user_id_fkey;
ALTER TABLE drawings ADD CONSTRAINT drawings_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Votes table: SET NULL on delete
ALTER TABLE votes DROP CONSTRAINT votes_user_id_fkey;
ALTER TABLE votes ADD CONSTRAINT votes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE votes ALTER COLUMN user_id DROP NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Restore NOT NULL constraints
ALTER TABLE matches ALTER COLUMN starter_id SET NOT NULL;
ALTER TABLE matches ALTER COLUMN finisher_id SET NOT NULL;
ALTER TABLE drawings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE votes ALTER COLUMN user_id SET NOT NULL;

-- Restore ON DELETE CASCADE (or original behavior)
ALTER TABLE matches DROP CONSTRAINT matches_starter_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_starter_id_fkey 
    FOREIGN KEY (starter_id) REFERENCES users(id);

ALTER TABLE matches DROP CONSTRAINT matches_finisher_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_finisher_id_fkey 
    FOREIGN KEY (finisher_id) REFERENCES users(id);

ALTER TABLE drawings DROP CONSTRAINT drawings_user_id_fkey;
ALTER TABLE drawings ADD CONSTRAINT drawings_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE votes DROP CONSTRAINT votes_user_id_fkey;
ALTER TABLE votes ADD CONSTRAINT votes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);

-- +goose StatementEnd