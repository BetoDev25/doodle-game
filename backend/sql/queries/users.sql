-- name: CreateUser :one
INSERT INTO users (username, email, password_hash, created_at, last_active_at, is_guest)
VALUES (
    $1,
    $2,
    $3,
	NOW(),
    NOW(),
    false
)
RETURNING id, username, email, created_at;

-- name: CreateGuest :one
INSERT INTO users (username, is_guest, expires_at)
VALUES (
    $1,
    true,
    NOW() + INTERVAL '24 hours'
)
RETURNING id, username;

-- name: GetUserByUsername :one
SELECT *
FROM users
WHERE username = $1;

-- name: GetUserByEmail :one
SELECT *
FROM users
WHERE email = $1;

-- name: UpdateLastActive :exec
UPDATE users
SET last_active_at = NOW()
WHERE id = $1;