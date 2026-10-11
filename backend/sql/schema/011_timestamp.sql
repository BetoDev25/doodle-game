-- +goose Up

-- Convert users timestamp columns to timestamptz, interpreting existing values as UTC
ALTER TABLE users
    ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN last_active_at TYPE timestamptz USING last_active_at AT TIME ZONE 'UTC',
    ALTER COLUMN expires_at TYPE timestamptz USING expires_at AT TIME ZONE 'UTC';

-- Convert matches timestamp columns to timestamptz, interpreting existing values as UTC
ALTER TABLE matches
    ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN finished_at TYPE timestamptz USING finished_at AT TIME ZONE 'UTC';

-- +goose Down

-- Revert to timestamp without time zone, dropping the UTC offset
ALTER TABLE matches
    ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN finished_at TYPE timestamp USING finished_at AT TIME ZONE 'UTC';

ALTER TABLE users
    ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN last_active_at TYPE timestamp USING last_active_at AT TIME ZONE 'UTC',
    ALTER COLUMN expires_at TYPE timestamp USING expires_at AT TIME ZONE 'UTC';