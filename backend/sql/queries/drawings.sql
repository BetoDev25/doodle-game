-- name: CreateDrawing :one
INSERT INTO drawings (match_id, user_id, doodle_strokes, finished_strokes)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: DeleteDrawingByMatchID :exec
DELETE FROM drawings WHERE match_id = $1;

-- name: UpdateDrawingFinished :exec
UPDATE drawings
SET finished_strokes = $1
WHERE match_id = $2 AND user_id = $3;

-- name: GetDrawingsByMatchID :many
SELECT * FROM drawings
WHERE match_id = $1;

-- name: GetDrawingsByUserID :many
SELECT match_id, finished_strokes, created_at
FROM drawings
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 20 OFFSET $2;

-- name: GetMostVotedDrawings :many
SELECT id, match_id, user_id, doodle_strokes, finished_strokes, vote_count, created_at
FROM drawings
WHERE created_at > NOW() - INTERVAL '1 day' * sqlc.arg(timeframe_days)
ORDER BY vote_count DESC, created_at DESC
LIMIT $1 OFFSET $2;

-- name: GetMostRecentDrawings :many
SELECT id, match_id, user_id, doodle_strokes, finished_strokes, vote_count, created_at
FROM drawings
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;