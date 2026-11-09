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



-- name: UpdateOfflineDrawingUser :exec
UPDATE drawings
SET user2_id = $1,
    finished_strokes = $2
WHERE id = $3;

-- name: GetRandomUnfinishedOfflineDrawing :one
SELECT 
    d.id AS drawing_id,
    d.doodle_strokes AS drawing_doodle,
    d.created_at AS drawing_created_at,
    COALESCE(u.username, 'Deleted User') AS username,
    COALESCE(u.avatar_path, '') AS user_avatar_path
FROM drawings d
LEFT JOIN users u ON u.id = d.user_id
WHERE d.isOffline = true
  AND d.finished_strokes = '[]'::jsonb
  AND d.user2_id IS NULL
ORDER BY random()
LIMIT 1;

-- name: GetOfflineDrawingByID :one
SELECT 
    d.id AS drawing_id,
    d.user_id AS drawing_user1_id,
    d.user2_id AS drawing_user2_id,
    d.doodle_strokes AS drawing_doodle,
    d.finished_strokes AS drawing_finished,
    d.created_at AS drawing_created_at,
    COALESCE(u1.username, 'Deleted User') AS user1_username,
    u1.is_guest AS user1_is_guest,
    COALESCE(u1.avatar_path, '') AS user1_avatar_path,
    COALESCE(u2.username, 'Deleted User') AS user2_username,
    u2.is_guest AS user2_is_guest,
    COALESCE(u2.avatar_path, '') AS user2_avatar_path
FROM drawings d
LEFT JOIN users u1 ON u1.id = d.user_id
LEFT JOIN users u2 ON u2.id = d.user2_id
WHERE d.id = $1 AND d.isOffline = true;

-- name: GetRecentOfflineDrawings :many
SELECT 
    d.id AS drawing_id,
    d.doodle_strokes AS drawing_doodle,
    d.finished_strokes AS drawing_finished,
    d.created_at AS drawing_created_at
FROM drawings d
WHERE d.isOffline = true
ORDER BY d.created_at DESC
LIMIT $1 OFFSET $2;

-- name: GetRecentOfflineDrawingsByUserID :many
SELECT 
    d.id AS drawing_id,
    d.doodle_strokes AS drawing_doodle,
    d.finished_strokes AS drawing_finished,
    d.created_at AS drawing_created_at
FROM drawings d
WHERE d.isOffline = true
  AND d.user2_id = $1
ORDER BY d.created_at DESC, d.id DESC
LIMIT $2 OFFSET $3;

-- name: GetTotalOfflineDrawings :one
SELECT COUNT(*)
FROM drawings
WHERE isOffline = true;

-- name: GetTotalOfflineDrawingsByUserID :one
SELECT COUNT(*)
FROM drawings
WHERE user2_id = $1
    AND isOffline = true;