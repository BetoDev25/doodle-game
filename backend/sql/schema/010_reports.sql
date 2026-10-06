-- +goose Up

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    reported_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_match ON reports(match_id);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);

-- +goose Down

DROP INDEX IF EXISTS idx_reports_match;
DROP INDEX IF EXISTS idx_reports_reporter;

DROP TABLE IF EXISTS reports;