-- name: CreateSession :one
INSERT INTO sessions (token, created_at, user_id, expires_at)
VALUES (
	$1,
	NOW(),
	$2,
	$3
)
RETURNING *;

-- name: GetUserByCookie :one
SELECT u.id, u.username
FROM sessions s
JOIN users u ON u.id = s.user_id
WHERE s.token = $1 AND s.expires_at > NOW();

-- name: DeleteSessionByToken :exec
DELETE FROM sessions WHERE token = $1;