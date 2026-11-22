document.addEventListener('DOMContentLoaded', async () => {
    // Get sketch ID from URL: /sketch/{id}
    const pathParts = window.location.pathname.split('/');
    const sketchId = pathParts[2];

    if (!sketchId) {
        window.location.href = '/main/';
        return;
    }

    await getCurrentUser();

    try {
        const response = await fetch(`/api/offlineDrawing/${sketchId}`, { credentials: 'same-origin' });

        if (!response.ok) {
            let errorMessage = 'Sketch not found';
            try {
                const errorData = await response.json();
                if (errorData.error) errorMessage = errorData.error;
                if (errorData.message) errorMessage = errorData.message;
            } catch (e) {}
            window.location.href = `/error?message=${encodeURIComponent(errorMessage)}`;
            return;
        }

        const data = await response.json();
        renderSketchPage(data);
    } catch (error) {
        console.error('Error loading sketch:', error);
        window.location.href = `/error?message=${encodeURIComponent('Error connecting to server')}`;
    }
});

function renderSketchPage(sketch) {
    const container = document.getElementById('sketch-container');

    const isGuest = !!(window.currentUser && window.currentUser.isGuest);

    // Format date
    let dateStr = 'Unknown date';
    if (sketch.DrawingCreatedAt) {
        try {
            const date = new Date(sketch.DrawingCreatedAt);
            if (!isNaN(date.getTime())) {
                dateStr = date.toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });
            }
        } catch (e) {
            console.error('Invalid date:', sketch.DrawingCreatedAt);
        }
    }

    const favoriteControl = isGuest
        ? `<a class="favorite-cta" href="/signup/">Create an account to save this sketch!</a>`
        : `<button class="favorite-btn" data-sketch-id="${sketch.DrawingID}" data-is-favorite="false">
               <span class="heart-icon">🤍</span>
               <span class="favorite-text">Favorite this sketch</span>
           </button>`;

    container.innerHTML = `
        <div class="match-page-container">
            <h1 class="match-title">Sketch from ${dateStr}</h1>
            ${favoriteControl}
            <div class="match-drawings">
                <div class="drawing-wrapper">
                    <div class="drawing-canvas-stack" id="stack1">
                        <canvas class="layer-canvas archive-background" id="sketch-background" width="500" height="400"></canvas>
                        <canvas class="layer-canvas archive-doodle"     id="sketch-doodle"     width="500" height="400"></canvas>
                        <canvas class="layer-canvas archive-drawing"    id="sketch-drawing"    width="500" height="400"></canvas>
                    </div>
                </div>
            </div>
            <div class="match-checkbox">
                <input type="checkbox" id="show-doodle-checkbox">
                <label for="show-doodle-checkbox">Show Doodle</label>
            </div>
            <div class="sketch-credits">
                <p>Started by ${sketch.User1Username || 'Deleted User'}</p>
                <p>Finished by ${sketch.User2Username || 'Deleted User'}</p>
            </div>
        </div>
    `;

    const W = 500;
    const H = 400;

    // Background: solid white
    const bg = document.getElementById('sketch-background').getContext('2d');
    bg.globalCompositeOperation = 'source-over';
    bg.fillStyle = '#ffffff';
    bg.fillRect(0, 0, W, H);

    // Doodle layer: the original starter sketch (user1)
    renderDoodleStrokes(
        document.getElementById('sketch-doodle').getContext('2d'),
        sketch.DrawingDoodle,
        W, H
    );

    // Drawing layer: the finisher's overlay (user2)
    renderDrawingStrokes(
        document.getElementById('sketch-drawing').getContext('2d'),
        sketch.DrawingFinished,
        W, H
    );

    // "Show Doodle" toggle: hides the finished overlay, revealing the raw doodle
    const drawingLayer = document.getElementById('sketch-drawing');
    document.getElementById('show-doodle-checkbox').addEventListener('change', (e) => {
        drawingLayer.style.display = e.target.checked ? 'none' : 'block';
    });

    // Favorite button (logged-in only)
    const favBtn = document.querySelector('.favorite-btn');
    if (favBtn) {
        favBtn.addEventListener('click', async function () {
            const newState = this.dataset.isFavorite !== 'true';
            const heartIcon = this.querySelector('.heart-icon');
            const favText = this.querySelector('.favorite-text');

            heartIcon.textContent = newState ? '❤️' : '🤍';
            favText.textContent = newState ? 'Unfavorite this sketch' : 'Favorite this sketch';
            this.dataset.isFavorite = newState ? 'true' : 'false';

            try {
                const response = await fetch(`/api/favorites/${newState}/${sketch.DrawingID}`, { method: 'POST' });
                if (!response.ok) throw new Error('failed');
            } catch (error) {
                heartIcon.textContent = newState ? '🤍' : '❤️';
                favText.textContent = newState ? 'Favorite this sketch' : 'Unfavorite this sketch';
                this.dataset.isFavorite = newState ? 'false' : 'true';
                alert('Failed to update favorite');
            }
        });
    }
}