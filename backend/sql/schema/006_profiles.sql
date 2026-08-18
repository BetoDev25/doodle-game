-- +goose Up
-- +goose StatementBegin
ALTER TABLE users ADD COLUMN profile_strokes JSONB;
ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE users DROP COLUMN profile_strokes;
ALTER TABLE users DROP COLUMN bio;
-- +goose StatementEnd