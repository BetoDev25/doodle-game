-- name: CreateMatch :one
INSERT INTO matches (id, starter_id, finisher_id, created_at)
VALUES ($1, $2, $3, NOW())
RETURNING *;