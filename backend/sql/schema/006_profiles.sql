-- +goose Up
-- +goose StatementBegin
ALTER TABLE users ADD COLUMN avatar_path TEXT;
ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE users DROP COLUMN avatar_path;
ALTER TABLE users DROP COLUMN bio;
-- +goose StatementEnd