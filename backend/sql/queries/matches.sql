-- name: CreateMatch :one
INSERT INTO matches (id, player1_id, player2_id, created_at)
VALUES ($1, $2, $3, NOW())
RETURNING *;

-- name: UpdateMatch :exec
UPDATE matches
SET 
    drawing1_id = $1,
    drawing2_id = $2
WHERE id = $3;

-- name: DeleteMatchByID :exec
DELETE FROM matches WHERE id = $1;

-- name: GetMostRecentMatches :many
SELECT 
    m.id AS match_id,
    m.created_at AS match_created_at,
    m.finished_at,
    m.favorites_count,
    m.player1_id,
    m.player2_id,
    d1.id AS drawing1_id,
    d1.user_id AS drawing1_user_id,
    d1.doodle_strokes AS drawing1_doodle,
    d1.finished_strokes AS drawing1_finished,
    d2.id AS drawing2_id,
    d2.user_id AS drawing2_user_id,
    d2.doodle_strokes AS drawing2_doodle,
    d2.finished_strokes AS drawing2_finished,
    COALESCE(u1.username, 'Deleted User') AS player1_username,
    COALESCE(u2.username, 'Deleted User') AS player2_username
FROM matches m
LEFT JOIN drawings d1 ON d1.match_id = m.id
LEFT JOIN drawings d2 ON d2.match_id = m.id AND d2.id != d1.id
LEFT JOIN users u1 ON u1.id = m.player1_id
LEFT JOIN users u2 ON u2.id = m.player2_id
WHERE d1.id IS NOT NULL AND d2.id IS NOT NULL
  AND COALESCE(d1.user_id, '00000000-0000-0000-0000-000000000000') < COALESCE(d2.user_id, '00000000-0000-0000-0000-000000000000')
ORDER BY m.created_at DESC
LIMIT $1 OFFSET $2;

-- name: GetMostRecentMatchesByUsername :many
SELECT 
    m.id AS match_id,
    m.created_at AS match_created_at,
    m.finished_at,
    m.favorites_count,
    m.player1_id,
    m.player2_id,
    d1.id AS drawing1_id,
    d1.user_id AS drawing1_user_id,
    d1.doodle_strokes AS drawing1_doodle,
    d1.finished_strokes AS drawing1_finished,
    d2.id AS drawing2_id,
    d2.user_id AS drawing2_user_id,
    d2.doodle_strokes AS drawing2_doodle,
    d2.finished_strokes AS drawing2_finished,
    COALESCE(u1.username, 'Deleted User') AS player1_username,
    COALESCE(u2.username, 'Deleted User') AS player2_username
FROM matches m
LEFT JOIN drawings d1 ON d1.match_id = m.id
LEFT JOIN drawings d2 ON d2.match_id = m.id AND d2.id != d1.id
LEFT JOIN users u1 ON u1.id = m.player1_id
LEFT JOIN users u2 ON u2.id = m.player2_id
WHERE d1.id IS NOT NULL AND d2.id IS NOT NULL
  AND COALESCE(d1.user_id, '00000000-0000-0000-0000-000000000000') < COALESCE(d2.user_id, '00000000-0000-0000-0000-000000000000')
  AND (m.player1_id = $1 OR m.player2_id = $1)
ORDER BY m.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetTotalMatches :one
SELECT COUNT(DISTINCT m.id)
FROM matches m
LEFT JOIN drawings d1 ON d1.match_id = m.id
LEFT JOIN drawings d2 ON d2.match_id = m.id AND d2.id != d1.id
WHERE d1.id IS NOT NULL AND d2.id IS NOT NULL
  AND COALESCE(d1.user_id, '00000000-0000-0000-0000-000000000000') < COALESCE(d2.user_id, '00000000-0000-0000-0000-000000000000');

-- name: GetTotalMatchesByUsername :one
SELECT COUNT(DISTINCT m.id)
FROM matches m
LEFT JOIN drawings d1 ON d1.match_id = m.id
LEFT JOIN drawings d2 ON d2.match_id = m.id AND d2.id != d1.id
WHERE d1.id IS NOT NULL AND d2.id IS NOT NULL
  AND COALESCE(d1.user_id, '00000000-0000-0000-0000-000000000000') < COALESCE(d2.user_id, '00000000-0000-0000-0000-000000000000')
  AND (m.player1_id = $1 OR m.player2_id = $1);
