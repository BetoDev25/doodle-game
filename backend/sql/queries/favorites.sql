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