-- name: CreateNotification :one
INSERT INTO notifications (type, recipient_id, drawing_id, body)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetNotificationsByUserID :many
SELECT *
FROM notifications
WHERE recipient_id = $1
ORDER BY created_at DESC;