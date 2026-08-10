-- name: CreateDrawing :one
INSERT INTO drawings (match_id, user_id, doodle_strokes, finished_strokes)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetDrawingsByMatchID :many
SELECT * FROM drawings
WHERE match_id = $1;

-- name: UpdateDrawingFinished :exec
UPDATE drawings
SET finished_strokes = $1
WHERE match_id = $2 AND user_id = $3;