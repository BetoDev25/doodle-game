document.addEventListener('DOMContentLoaded', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));

    const user = window.currentUser;
    if (!user || user.isGuest) {
        // Redirect to welcome page
        window.location.href = '/';
        return;
    }
    
    await loadFavorites();

    const data = await getRecentMatches(1);
    if (data) {
        // Only show first 10 matches
        const firstEight = data.matches ? data.matches.slice(0, 10) : [];
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
    if (!grid) {
        return;
    }
    
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
            window.location.href = `/match/${item.MatchID}`;
        });
    });
}