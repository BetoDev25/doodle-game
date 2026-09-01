document.addEventListener('DOMContentLoaded', async () => {
    // Wait for taskbar to load the user
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await loadFavorites();

    // Get page number from URL
    const pathParts = window.location.pathname.split('/');
    const page = parseInt(pathParts[2]) || 1;
    
    // Update page number in header
    document.getElementById('page-number').textContent = page;

    // Load matches
    const data = await getRecentMatches(page);
    if (data) {
        renderMatches(data);
    }
});

function renderMatches(data) {
    const grid = document.getElementById('drawings-grid');
    
    const items = data.matches || [];
    const totalPages = data.total_pages || 0;
    const currentPage = data.current_page || 1;

    if (items.length === 0) {
        grid.innerHTML = `<p>No matches yet.</p>`;
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

    // Pagination
    html += `<div class="pagination">`;
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `</div>`;

    grid.innerHTML = html;

    // Pagination click listeners
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            window.location.href = `/matches/${page}`;
        });
    });

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