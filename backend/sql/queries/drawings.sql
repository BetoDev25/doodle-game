-- name: CreateDrawing :one
INSERT INTO drawings (match_id, starter_id, finisher_id, doodle_strokes, finished_strokes)
VALUES (
	$1,
	$2,
	$3,
    $4,
    $5
)
RETURNING *;

-- name: UpdateDrawingFinished :exec
UPDATE drawings
SET finished_strokes = $1, finished_at = NOW()
WHERE match_id = $2;

-- name: GetDrawingByMatchID :one
SELECT * FROM drawings
WHERE match_id = $1;