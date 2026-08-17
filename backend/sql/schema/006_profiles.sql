-- +goose Up
-- +goose StatementBegin
ALTER TABLE users ADD COLUMN profile_strokes JSONB;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE users DROP COLUMN profile_strokes;
-- +goose StatementEnd