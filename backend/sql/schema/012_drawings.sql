-- +goose Up
-- +goose StatementBegin

-- Add user2_id matching user_id's type and constraints (nullable UUID, FK with ON DELETE SET NULL)
ALTER TABLE drawings
    ADD COLUMN user2_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Index it to mirror idx_drawings_user_id (optional, but keeps parity with user_id)
CREATE INDEX idx_drawings_user2_id ON drawings(user2_id);

-- Add isOffline flag, defaults to false
ALTER TABLE drawings
    ADD COLUMN isOffline BOOLEAN NOT NULL DEFAULT false;

-- Make match_id nullable
ALTER TABLE drawings ALTER COLUMN match_id DROP NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Restore match_id NOT NULL (will fail if NULLs exist)
ALTER TABLE drawings ALTER COLUMN match_id SET NOT NULL;

-- Drop isOffline
ALTER TABLE drawings DROP COLUMN isOffline;

-- Drop user2_id (dropping the column also drops its index)
ALTER TABLE drawings DROP COLUMN user2_id;

-- +goose StatementEnd