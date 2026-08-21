-- name: CreateUser :one
INSERT INTO users (username, email, password_hash, created_at, last_active_at, is_guest, avatar_path)
VALUES (
    $1,
    $2,
    $3,
	NOW(),
    NOW(),
    false,
    $4
)
RETURNING id, username, email, created_at, avatar_path;

-- name: CreateGuest :one
INSERT INTO users (username, is_guest, expires_at, avatar_path)
VALUES (
    $1,
    true,
    NOW() + INTERVAL '24 hours',
    $2
)
RETURNING id, username, avatar_path;

-- name: GetUserByUsername :one
SELECT *
FROM users
WHERE username = $1;

-- name: GetUserByID :one
SELECT *
FROM users
WHERE id = $1;

-- name: GetUserByEmail :one
SELECT *
FROM users
WHERE email = $1;

-- name: UpdateLastActive :exec
UPDATE users
SET last_active_at = NOW()
WHERE id = $1;

-- name: UpdateAvatar :exec
UPDATE users
SET avatar_path = $1
WHERE id = $2;