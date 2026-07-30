-- +goose Up

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL DEFAULT 'pending@example.com',
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_active_at TIMESTAMP
);

-- Matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    starter_id UUID NOT NULL REFERENCES users(id),
    finisher_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    finished_at TIMESTAMP
);

-- Drawings table
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

-- Votes table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    drawing_id UUID NOT NULL REFERENCES drawings(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, drawing_id)
);

-- Indexes for performance
CREATE INDEX idx_drawings_match_id ON drawings(match_id);
CREATE INDEX idx_drawings_starter_id ON drawings(starter_id);
CREATE INDEX idx_drawings_finisher_id ON drawings(finisher_id);
CREATE INDEX idx_drawings_vote_count ON drawings(vote_count);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_drawing_id ON votes(drawing_id);

-- +goose Down
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS drawings;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS users;
