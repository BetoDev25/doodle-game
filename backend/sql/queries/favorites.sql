-- name: AddFavorite :exec
INSERT INTO favorites (user_id, match_id)
VALUES ($1, $2);

-- name: RemoveFavorite :exec
DELETE FROM favorites
WHERE user_id = $1 AND match_id = $2;

-- name: GetUserFavoritesMatchIDs :many
SELECT match_id
FROM favorites
WHERE user_id = $1;

-- name: UpdateFavoritesCount :exec
UPDATE matches
SET favorites_count = favorites_count + $1
WHERE id = $2;

-- name: GetMostRecentFavoritesByUsername :many
SELECT 
    m.id AS match_id,
    m.created_at AS match_created_at,
    f.created_at AS favorited_at,
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
FROM favorites f
JOIN matches m ON m.id = f.match_id
JOIN drawings d1 ON d1.match_id = m.id
JOIN drawings d2 ON d2.match_id = m.id AND d2.user_id > d1.user_id
JOIN users u1 ON u1.id = d1.user_id
JOIN users u2 ON u2.id = d2.user_id
WHERE f.user_id = (SELECT id FROM users WHERE users.username = $1)
ORDER BY f.created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetTotalFavoritesByUsername :one
SELECT COUNT(DISTINCT f.match_id)
FROM favorites f
JOIN matches m ON m.id = f.match_id
JOIN drawings d1 ON d1.match_id = m.id
JOIN drawings d2 ON d2.match_id = m.id AND d2.user_id != d1.user_id
JOIN users u ON u.id = f.user_id
WHERE u.username = $1;