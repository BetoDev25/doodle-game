-- +goose Up
-- +goose StatementBegin

-- Drop dependent tables first
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS drawings;

-- Recreate drawings
CREATE TABLE drawings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doodle_strokes JSONB NOT NULL,
    finished_strokes JSONB NOT NULL,
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Recreate votes
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    drawing_id UUID NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, drawing_id)
);

-- Indexes
CREATE INDEX idx_drawings_match_id ON drawings(match_id);
CREATE INDEX idx_drawings_user_id ON drawings(user_id);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_drawing_id ON votes(drawing_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS drawings;

-- Restore old drawings table (if rolling back)
CREATE TABLE drawings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id),
    starter_id UUID NOT NULL REFERENCES users(id),
    finisher_id UUID NOT NULL REFERENCES users(id),
    doodle_strokes JSONB NOT NULL,
    finished_strokes JSONB NOT NULL,
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP
);

-- Restore old votes table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    drawing_id UUID NOT NULL REFERENCES drawings(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, drawing_id)
);

-- Restore indexes
CREATE INDEX idx_drawings_match_id ON drawings(match_id);
CREATE INDEX idx_drawings_starter_id ON drawings(starter_id);
CREATE INDEX idx_drawings_finisher_id ON drawings(finisher_id);
CREATE INDEX idx_drawings_vote_count ON drawings(vote_count);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_drawing_id ON votes(drawing_id);

-- +goose StatementEnd