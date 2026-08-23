-- +goose Up
-- +goose StatementBegin

-- Drop the unique constraint first (it still references the old table name)
ALTER TABLE votes DROP CONSTRAINT votes_user_id_drawing_id_key;

-- Drop foreign key constraint
ALTER TABLE votes DROP CONSTRAINT votes_drawing_id_fkey;

-- Drop the drawing_id column and add match_id
ALTER TABLE votes DROP COLUMN drawing_id;
ALTER TABLE votes ADD COLUMN match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE;

-- Add new unique constraint
ALTER TABLE votes ADD CONSTRAINT votes_user_id_match_id_key UNIQUE (user_id, match_id);

-- Rename the table at the end
ALTER TABLE votes RENAME TO favorites;

-- Remove vote_count from drawings
ALTER TABLE drawings DROP COLUMN vote_count;

-- Add favorites_count to matches
ALTER TABLE matches ADD COLUMN favorites_count INTEGER DEFAULT 0;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Rename back first
ALTER TABLE favorites RENAME TO votes;

-- Remove favorites_count from matches
ALTER TABLE matches DROP COLUMN favorites_count;

-- Add vote_count back to drawings
ALTER TABLE drawings ADD COLUMN vote_count INTEGER DEFAULT 0;

-- Drop new unique constraint
ALTER TABLE votes DROP CONSTRAINT votes_user_id_match_id_key;

-- Drop match_id and re-add drawing_id
ALTER TABLE votes DROP COLUMN match_id;
ALTER TABLE votes ADD COLUMN drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE;

-- Re-add original unique constraint
ALTER TABLE votes ADD CONSTRAINT votes_user_id_drawing_id_key UNIQUE (user_id, drawing_id);

-- +goose StatementEnd