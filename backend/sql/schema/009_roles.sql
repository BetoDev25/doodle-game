-- +goose Up

ALTER TABLE users
ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
    CHECK (role IN ('user', 'admin', 'superadmin'));

-- +goose Down

ALTER TABLE users
DROP COLUMN IF EXISTS role;