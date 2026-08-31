document.addEventListener('DOMContentLoaded', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await loadFavorites();

    const data = await getRecentMatches(1);
    if (data) {
        // Only show first 8 matches
        const firstEight = data.matches ? data.matches.slice(0, 5) : [];
        const trimmedData = {
            ...data,
            matches: firstEight
        };
        renderDrawings(trimmedData, 'Recent Matches');
    }
});

async function getRecentMatches(page) {
    const response = await fetch(`/api/matches/${page}`);
    if (!response.ok) {
        return null;
    }
    const data = await response.json();

    if (page > data.total_pages && data.total_pages > 0) {
        window.location.href = `/?page=${data.total_pages}`;
        return null;
    }

    return data;
}

// Override renderDrawings to use time ago format and no pagination
function renderDrawings(data, title) {
    const grid = document.getElementById('drawings-grid');
    
    const items = data.matches || [];

    if (items.length === 0) {
        grid.innerHTML = `<h2>${title}</h2><p>No matches yet.</p>`;
        return;
    }

    let html = `<div class="drawings-grid-container">`;
    
    items.forEach(item => {
        let dateStr = formatTimeAgo(item.MatchCreatedAt);

        html += `
            <div class="drawing-card" data-match-id="${item.MatchID}">
                <canvas class="drawing-thumbnail" width="200" height="150"></canvas>
                <p class="drawing-date">${dateStr}</p>
            </div>
        `;
    });
    
    html += '</div>';

    grid.innerHTML = html;

    // Render thumbnails
    document.querySelectorAll('.drawing-card').forEach((card, index) => {
        const canvas = card.querySelector('.drawing-thumbnail');
        const ctx = canvas.getContext('2d');
        const item = items[index];
        
        let strokes = item.Drawing1Finished || item.Drawing1Doodle;
        
        renderStrokes(ctx, strokes, 200, 150);
        
        card.addEventListener('click', () => {
            const matchData = {
                match_id: item.MatchID,
                drawing1_user_id: item.Drawing1UserID,
                drawing1_username: item.Player1Username?.String || item.Player1Username || 'Deleted User',
                drawing1_doodle: item.Drawing1Doodle,
                drawing1_finished: item.Drawing1Finished,
                drawing2_user_id: item.Drawing2UserID,
                drawing2_username: item.Player2Username?.String || item.Player2Username || 'Deleted User',
                drawing2_doodle: item.Drawing2Doodle,
                drawing2_finished: item.Drawing2Finished
            };
            matchData.is_favorite = userFavorites.includes(item.MatchID);
            renderModalDrawings(matchData);
            openModal();
        });
    });
}

// Helper function to format time ago
function formatTimeAgo(dateValue) {
    if (!dateValue) return 'Unknown date';
    
    let date;
    if (dateValue.Time !== undefined) {
        date = new Date(dateValue.Time);
    } else {
        date = new Date(dateValue);
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