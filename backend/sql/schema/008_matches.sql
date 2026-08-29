-- +goose Up

-- Rename columns
ALTER TABLE matches 
RENAME COLUMN starter_id TO player1_id;

ALTER TABLE matches 
RENAME COLUMN finisher_id TO player2_id;

-- Remove existing foreign key constraints
ALTER TABLE matches 
DROP CONSTRAINT matches_starter_id_fkey;

ALTER TABLE matches 
DROP CONSTRAINT matches_finisher_id_fkey;

-- Add new foreign key constraints with ON DELETE SET NULL
ALTER TABLE matches 
ADD CONSTRAINT matches_player1_id_fkey 
FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE matches 
ADD CONSTRAINT matches_player2_id_fkey 
FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add drawing columns (nullable)
ALTER TABLE matches 
ADD COLUMN drawing1_id UUID;

ALTER TABLE matches 
ADD COLUMN drawing2_id UUID;

-- Add foreign key constraints for drawings
ALTER TABLE matches 
ADD CONSTRAINT matches_drawing1_id_fkey 
FOREIGN KEY (drawing1_id) REFERENCES drawings(id);

ALTER TABLE matches 
ADD CONSTRAINT matches_drawing2_id_fkey 
FOREIGN KEY (drawing2_id) REFERENCES drawings(id);

-- Indexes for new columns
CREATE INDEX idx_matches_player1_id ON matches(player1_id);
CREATE INDEX idx_matches_player2_id ON matches(player2_id);
CREATE INDEX idx_matches_drawing1_id ON matches(drawing1_id);
CREATE INDEX idx_matches_drawing2_id ON matches(drawing2_id);

-- +goose Down

-- Drop indexes
DROP INDEX IF EXISTS idx_matches_player1_id;
DROP INDEX IF EXISTS idx_matches_player2_id;
DROP INDEX IF EXISTS idx_matches_drawing1_id;
DROP INDEX IF EXISTS idx_matches_drawing2_id;

-- Drop foreign key constraints
ALTER TABLE matches 
DROP CONSTRAINT IF EXISTS matches_drawing1_id_fkey;

ALTER TABLE matches 
DROP CONSTRAINT IF EXISTS matches_drawing2_id_fkey;

ALTER TABLE matches 
DROP CONSTRAINT IF EXISTS matches_player1_id_fkey;

ALTER TABLE matches 
DROP CONSTRAINT IF EXISTS matches_player2_id_fkey;

-- Remove columns
ALTER TABLE matches 
DROP COLUMN IF EXISTS drawing1_id;

ALTER TABLE matches 
DROP COLUMN IF EXISTS drawing2_id;

-- Rename columns back
ALTER TABLE matches 
RENAME COLUMN player1_id TO starter_id;

ALTER TABLE matches 
RENAME COLUMN player2_id TO finisher_id;

-- Restore original foreign key constraints
ALTER TABLE matches 
ADD CONSTRAINT matches_starter_id_fkey 
FOREIGN KEY (starter_id) REFERENCES users(id);

ALTER TABLE matches 
ADD CONSTRAINT matches_finisher_id_fkey 
FOREIGN KEY (finisher_id) REFERENCES users(id);