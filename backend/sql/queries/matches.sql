-- name: CreateMatch :one
INSERT INTO matches (id, starter_id, finisher_id, created_at)
VALUES ($1, $2, $3, NOW())
RETURNING *;

-- name: DeleteMatchByID :exec
DELETE FROM matches WHERE id = $1;

-- name: GetMostRecentMatches :many
SELECT *
FROM matches
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;