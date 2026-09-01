let currentUserPromise = null;

async function getCurrentUser() {
    // If we already have a user, return it
    if (window.currentUser) {
        return window.currentUser;
    }
    
    // If there's already a promise in progress, return it
    if (currentUserPromise) {
        return currentUserPromise;
    }

    currentUserPromise = (async () => {
        try {
            const response = await fetch('/api/me');
            
            if (response.ok) {
                const user = await response.json();
                window.currentUser = {
                    id: user.id,
                    username: user.username,
                    isGuest: user.is_guest,
                    created_at: user.created_at,
                    bio: user.bio,
                    avatar_path: user.avatar_path || '/avatars/default.png',
                };
                // Store the actual username from the server
                localStorage.setItem('guestUsername', user.username);
                renderTaskbar();
                return window.currentUser;
            }

            let guestUsername = localStorage.getItem('guestUsername');
            
            // If we have a guest username stored, use it
            // But also check if this guest already exists by trying to get it
            if (!guestUsername) {
                guestUsername = `Guest${Math.floor(Math.random() * 10000)}`;
                localStorage.setItem('guestUsername', guestUsername);
            }

            // Create guest in database
            const guestRes = await fetch(`/api/guests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: guestUsername })
            });
            
            if (guestRes.ok) {
                const guest = await guestRes.json();
                console.log('Guest response:', guest);
                // Store the exact username from the server
                localStorage.setItem('guestUsername', guest.username);
                window.currentUser = {
                    id: guest.ID,
                    username: guest.username,
                    isGuest: true,
                    avatar_path: guest.avatar_path || '/avatars/default.png',
                };
                renderTaskbar();
                return window.currentUser;
            }

            window.currentUser = {
                username: guestUsername,
                isGuest: true,
                id: null,
            };
            renderTaskbar();
            return window.currentUser;
        } finally {
            currentUserPromise = null;
        }
    })();

    return currentUserPromise;
}

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

function renderStrokes(ctx, strokesData, width, height) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const parsedData = parseStrokes(strokesData);

    if (!parsedData || parsedData.length === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No strokes', width/2, height/2);
        return;
    }

    parsedData.forEach(stroke => {
        ctx.strokeStyle = stroke.color || '#000000';
        ctx.lineWidth = stroke.size || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.points && stroke.points.length > 0) {
            ctx.beginPath();
            const first = stroke.points[0];
            ctx.moveTo(first.x * width, first.y * height);
            for (let i = 1; i < stroke.points.length; i++) {
                const point = stroke.points[i];
                ctx.lineTo(point.x * width, point.y * height);
            }
            ctx.stroke();
        }
    });
}

function renderStrokesOnCanvas(ctx, strokesData, width, height) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const parsedData = parseStrokes(strokesData);

    if (!parsedData || parsedData.length === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No strokes', width/2, height/2);
        return;
    }

    strokesData.forEach(stroke => {
        ctx.strokeStyle = stroke.color || '#000000';
        ctx.lineWidth = stroke.size || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.points && stroke.points.length > 0) {
            ctx.beginPath();
            const first = stroke.points[0];
            ctx.moveTo(first.x * width, first.y * height);
            for (let i = 1; i < stroke.points.length; i++) {
                const point = stroke.points[i];
                ctx.lineTo(point.x * width, point.y * height);
            }
            ctx.stroke();
        }
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