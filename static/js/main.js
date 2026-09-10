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
                <div class="drawing-canvas-stack thumbnail-stack">
                    <canvas class="layer-canvas thumbnail-background" width="200" height="150"></canvas>
                    <canvas class="layer-canvas thumbnail-doodle"     width="200" height="150"></canvas>
                    <canvas class="layer-canvas thumbnail-drawing"    width="200" height="150"></canvas>
                </div>
                <p class="drawing-date">${dateStr}</p>
            </div>
        `;
    });

    html += '</div>';

    grid.innerHTML = html;

    // Render thumbnails
    document.querySelectorAll('.drawing-card').forEach((card, index) => {
        const item = items[index];
        const W = 200;
        const H = 150;

        const bgCtx     = card.querySelector('.thumbnail-background').getContext('2d');
        const doodleCtx = card.querySelector('.thumbnail-doodle').getContext('2d');
        const drawCtx   = card.querySelector('.thumbnail-drawing').getContext('2d');

        // Background
        bgCtx.globalCompositeOperation = 'source-over';
        bgCtx.fillStyle = '#ffffff';
        bgCtx.fillRect(0, 0, W, H);

        // Doodle layer: Player 2's doodle (the one Player 1 drew on top of)
        renderDoodleStrokes(doodleCtx, item.Drawing2Doodle, W, H);

        // Drawing layer: Player 1's finished overlay
        renderDrawingStrokes(drawCtx, item.Drawing1Finished, W, H);

        card.addEventListener('click', () => {
            window.location.href = `/match/${item.MatchID}`;
        });
    });
}