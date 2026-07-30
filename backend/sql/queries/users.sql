-- name: CreateUser :one
INSERT INTO users (username, email, password_hash, created_at, last_active_at)
VALUES (
    $1,
    $2,
    $3,
	NOW(),
    NOW()
)
RETURNING id, username, email, created_at;

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