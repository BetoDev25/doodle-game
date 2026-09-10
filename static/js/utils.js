async function loadFavorites() {
    const response = await fetch('/api/favorites');
    if (response.ok) {
        const data = await response.json();
        userFavorites = data.favorites || []; // Array of match IDs
    }
}

async function getRecentFavorites(username, page) {
    const response = await fetch(`/api/profile/${username}/favorites/${page}`);
    if (!response.ok) {
        return null;
    }
    const data = await response.json();

    if (page > data.total_pages && data.total_pages > 0) {
        window.location.href = `/profile/${username}/favorites/${data.total_pages}`;
        return null;
    }

    return data;
}

async function getRecentMatchesByUsername(username, page) {
    const response = await fetch(`/api/profile/${username}/matches/${page}`);
    if (!response.ok) {
        return null;
    }
    const data = await response.json();

    if (page > data.total_pages && data.total_pages > 0) {
        window.location.href = `/profile/${username}/matches/${data.total_pages}`;
        return null;
    }

    return data;
}

async function getRecentMatches(page) {
    const response = await fetch(`/api/matches/${page}`);
    if (!response.ok) {
        return null;
    }
    const data = await response.json();

    if (page > data.total_pages && data.total_pages > 0) {
        window.location.href = `/profile/matches/${data.total_pages}`;
        return null;
    }

    return data;
}

function parseStrokes(strokesData) {
    if (!strokesData) {
        return [];
    }

    // Handle the RawMessage structure from sqlc
    if (strokesData.RawMessage !== undefined) {
        if (Array.isArray(strokesData.RawMessage)) {
            return strokesData.RawMessage;
        }
        // If RawMessage is a string, parse it
        if (typeof strokesData.RawMessage === 'string') {
            try {
                return JSON.parse(strokesData.RawMessage);
            } catch (e) {
                return [];
            }
        }
    }

    if (typeof strokesData === 'string') {
        try {
            const parsed = JSON.parse(strokesData);
            return parsed;
        } catch (e) {
            return [];
        }
    }

    if (Array.isArray(strokesData)) {
        return strokesData;
    }

    return [];
}

// Replays a single stroke onto a context.
// - color === null  => erase (destination-out)
// - color === hex   => paint with source-over
// Points are stored relative (0–1) and scaled to width/height on replay.
function _replayStroke(ctx, stroke, width, height) {
    if (!stroke.points || stroke.points.length === 0) return;

    const isErase = stroke.color === null;

    ctx.globalCompositeOperation = isErase ? 'destination-out' : 'source-over';
    if (!isErase) {
        ctx.strokeStyle = stroke.color || '#000000';
    }
    ctx.lineWidth = stroke.size || 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    const first = stroke.points[0];
    ctx.moveTo(first.x * width, first.y * height);
    for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i];
        ctx.lineTo(point.x * width, point.y * height);
    }
    ctx.stroke();

    // Reset so the next caller isn't surprised.
    ctx.globalCompositeOperation = 'source-over';
}

function renderDoodleStrokes(ctx, strokesData, width, height) {
    ctx.clearRect(0, 0, width, height);

    const parsedData = parseStrokes(strokesData);

    if (!parsedData || parsedData.length === 0) {
        return;
    }

    parsedData.forEach(stroke => {
        _replayStroke(ctx, stroke, width, height);
    });
}

function renderDrawingStrokes(ctx, strokesData, width, height) {
    ctx.clearRect(0, 0, width, height);

    const parsedData = parseStrokes(strokesData);

    if (!parsedData || parsedData.length === 0) {
        return;
    }

    parsedData.forEach(stroke => {
        _replayStroke(ctx, stroke, width, height);
    });
}

function formatTimeAgo(dateValue) {
    if (!dateValue) return 'Unknown date';

    let date;
    if (dateValue.Time !== undefined) {
        const timeStr = dateValue.Time.replace('Z', '');
        date = new Date(timeStr);
    } else {
        const timeStr = String(dateValue).replace('Z', '');
        date = new Date(timeStr);
    }

    if (isNaN(date.getTime())) return 'Unknown date';

    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);

    if (diffSeconds > 86400) {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    if (diffSeconds < 60) {
        return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
}