-- +goose Up
-- +goose StatementBegin

-- Add guest columns to users table
ALTER TABLE users ADD COLUMN is_guest BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN expires_at TIMESTAMP;

-- Make password_hash nullable (guests don't have passwords)
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Remove guest columns
ALTER TABLE users DROP COLUMN is_guest;
ALTER TABLE users DROP COLUMN expires_at;

-- Restore password_hash NOT NULL
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

-- +goose StatementEnd