document.addEventListener('DOMContentLoaded', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));

    await loadFavorites();

    const pathParts = window.location.pathname.split('/');
    const page = parseInt(pathParts[2]) || 1;

    document.getElementById('page-number').textContent = page;

    const data = await getRecentSketches(page);
    if (data) {
        renderSketches(data);
    }
});

async function getRecentSketches(page) {
    const response = await fetch(`/api/offlineDrawings/${page}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (page > data.total_pages && data.total_pages > 0) {
        window.location.href = `/sketches/${data.total_pages}`;
        return null;
    }
    return data;
}

function renderSketches(data) {
    const grid = document.getElementById('drawings-grid');

    const items = data.drawings || [];
    const totalPages = data.total_pages || 0;
    const currentPage = data.current_page || 1;

    if (items.length === 0) {
        grid.innerHTML = `<p>No sketches yet.</p>`;
        return;
    }

    let html = `<div class="drawings-grid-container">`;

    items.forEach(item => {
        const dateStr = formatTimeAgo(item.DrawingCreatedAt);

        html += `
            <div class="drawing-card" data-drawing-id="${item.DrawingID}">
                <canvas class="drawing-thumbnail" width="200" height="150"></canvas>
                <p class="drawing-date">${dateStr}</p>
            </div>
        `;
    });

    html += '</div>';

    // Pagination
    html += `<div class="pagination">`;

    if (currentPage > 1) {
        html += `<button class="page-btn page-nav" data-page="${currentPage - 1}">&lt;</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    const nextPage = Math.min(currentPage + 1, totalPages);
    html += `<button class="page-btn page-nav" data-page="${nextPage}">&gt;</button>`;

    html += `</div>`;

    grid.innerHTML = html;

    // Pagination click listeners
    grid.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            window.location.href = `/sketches/${btn.dataset.page}`;
        });
    });

    // Render thumbnails
    grid.querySelectorAll('.drawing-card').forEach((card, index) => {
        const canvas = card.querySelector('.drawing-thumbnail');
        const ctx = canvas.getContext('2d');
        const item = items[index];

        // One drawing: finished overlay if present, else the raw doodle
        const strokes = item.DrawingFinished && item.DrawingFinished.length
            ? item.DrawingFinished
            : item.DrawingDoodle;

        renderDrawingStrokes(ctx, strokes, 200, 150);

        card.addEventListener('click', () => {
            window.location.href = `/sketch/${item.DrawingID}`;
        });
    });
}