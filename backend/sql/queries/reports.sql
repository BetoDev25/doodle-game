-- name: CreateReport :one
INSERT INTO reports(reporter_id, match_id, url, reported_at) 
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: DeleteReportByID :exec
DELETE FROM reports WHERE id = $1;