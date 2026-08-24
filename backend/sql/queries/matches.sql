-- name: CreateMatch :one
INSERT INTO matches (id, starter_id, finisher_id, created_at)
VALUES ($1, $2, $3, NOW())
RETURNING *;

-- name: DeleteMatchByID :exec
DELETE FROM matches WHERE id = $1;

-- name: GetMostRecentMatches :many
SELECT DISTINCT ON (m.id)
    m.id AS match_id,
    m.created_at AS match_created_at,
    d1.id AS drawing1_id,
    d1.user_id AS drawing1_user_id,
    u1.username AS drawing1_username,
    d1.doodle_strokes AS drawing1_doodle,
    d1.finished_strokes AS drawing1_finished,
    d2.id AS drawing2_id,
    d2.user_id AS drawing2_user_id,
    u2.username AS drawing2_username,
    d2.doodle_strokes AS drawing2_doodle,
    d2.finished_strokes AS drawing2_finished
FROM matches m
JOIN drawings d1 ON d1.match_id = m.id
JOIN drawings d2 ON d2.match_id = m.id AND d2.user_id != d1.user_id
JOIN users u1 ON u1.id = d1.user_id
JOIN users u2 ON u2.id = d2.user_id
ORDER BY m.id, m.created_at DESC
LIMIT $1 OFFSET $2;

-- name: GetTotalMatches :one
SELECT COUNT(DISTINCT m.id)
FROM matches m
JOIN drawings d1 ON d1.match_id = m.id
JOIN drawings d2 ON d2.match_id = m.id AND d2.user_id != d1.user_id;

-- name: GetTotalMatchesByUsername :one
SELECT COUNT(DISTINCT m.id)
FROM matches m
JOIN drawings d1 ON d1.match_id = m.id
JOIN drawings d2 ON d2.match_id = m.id AND d2.user_id != d1.user_id
JOIN users u ON u.id = m.starter_id OR u.id = m.finisher_id
WHERE u.username = $1;
