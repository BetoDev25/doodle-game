-- +goose Up
CREATE TABLE sessions (
    token TEXT PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL
);


-- +goose Down
DROP TABLE sessions;