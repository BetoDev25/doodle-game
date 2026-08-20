-- name: AddVote :exec
INSERT INTO votes (user_id, drawing_id)
VALUES ($1, $2);

-- name: RemoveVote :exec
DELETE FROM votes
WHERE user_id = $1 AND drawing_id = $2;

-- name: GetUserVotedDrawingIDs :many
SELECT drawing_id
FROM votes
WHERE user_id = $1;

-- name: UpdateVoteCount :exec
UPDATE drawings
SET vote_count = vote_count + $1
WHERE id = $2;