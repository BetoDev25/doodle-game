-- +goose Up
-- +goose StatementBegin

CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type         TEXT NOT NULL,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    drawing_id   UUID REFERENCES drawings(id) ON DELETE CASCADE,
    body         TEXT NOT NULL,
    is_read      BOOLEAN NOT NULL DEFAULT false,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hot path: recent/unread notifications for a user
CREATE INDEX idx_notifications_recipient_created
    ON notifications(recipient_id, created_at DESC);

-- Unread badge count
CREATE INDEX idx_notifications_unread
    ON notifications(recipient_id, created_at DESC)
    WHERE is_read = false;

-- Milestone dedupe: one notification per (recipient, drawing, type) — e.g. "favorite_10"
CREATE UNIQUE INDEX uniq_milestone_notification
    ON notifications(recipient_id, drawing_id, type)
    WHERE type LIKE 'favorite_%';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS notifications;

-- +goose StatementEnd