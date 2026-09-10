document.addEventListener('DOMContentLoaded', async () => {
    // Get match ID from URL
    const pathParts = window.location.pathname.split('/');
    const matchId = pathParts[2]; // /match/{id}

    if (!matchId) {
        window.location.href = '/main/';
        return;
    }

    await loadFavorites();

    // Fetch the match data
    try {
        const response = await fetch(`/api/match/${matchId}`);

        if (!response.ok) {
            // Try to parse the error message from the response
            let errorMessage = 'Match not found';
            try {
                const errorData = await response.json();
                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                // If response isn't JSON, use default message
            }

            // Redirect to error page with the message
            window.location.href = `/error?message=${encodeURIComponent(errorMessage)}`;
            return;
        }

        const data = await response.json();
        renderMatchPage(data);
    } catch (error) {
        console.error('Error loading match:', error);
        window.location.href = `/error?message=${encodeURIComponent('Error connecting to server')}`;
    }
});

function renderMatchPage(matchData) {
    const container = document.getElementById('match-container');

    // Determine if the match is favorited
    const isFavorite = userFavorites.includes(matchData.MatchID);

    // Format the date
    let dateStr = 'Unknown date';
    if (matchData.MatchCreatedAt) {
        try {
            const timeStr = matchData.MatchCreatedAt.replace('Z', '');
            const date = new Date(timeStr);
            if (!isNaN(date.getTime())) {
                dateStr = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        } catch (e) {
            console.error('Invalid date:', matchData.MatchCreatedAt);
        }
    }

    container.innerHTML = `
        <div class="match-page-container">
            <h1 class="match-title">Match completed on ${dateStr}</h1>
            <button class="favorite-btn" data-match-id="${matchData.MatchID}" data-is-favorite="${isFavorite}">
                <span class="heart-icon">${isFavorite ? '❤️' : '🤍'}</span>
                <span class="favorite-text">${isFavorite ? 'Match Favorited' : 'Favorite This Match'}</span>
            </button>
            <div class="match-drawings">
                <div class="drawing-wrapper">
                    <h3>${matchData.Player1Username || 'Deleted User'}</h3>
                    <div class="drawing-canvas-stack" id="stack1">
                        <canvas class="layer-canvas archive-background" id="drawing1-background" width="500" height="400"></canvas>
                        <canvas class="layer-canvas archive-doodle"     id="drawing1-doodle"     width="500" height="400"></canvas>
                        <canvas class="layer-canvas archive-drawing"    id="drawing1-drawing"    width="500" height="400"></canvas>
                    </div>
                </div>
                <div class="drawing-wrapper">
                    <h3>${matchData.Player2Username || 'Deleted User'}</h3>
                    <div class="drawing-canvas-stack" id="stack2">
                        <canvas class="layer-canvas archive-background" id="drawing2-background" width="500" height="400"></canvas>
                        <canvas class="layer-canvas archive-doodle"     id="drawing2-doodle"     width="500" height="400"></canvas>
                        <canvas class="layer-canvas archive-drawing"    id="drawing2-drawing"    width="500" height="400"></canvas>
                    </div>
                </div>
            </div>
            <div class="match-checkbox">
                <input type="checkbox" id="show-doodle-checkbox">
                <label for="show-doodle-checkbox">Show Doodle</label>
            </div>
        </div>
    `;

    const W = 500;
    const H = 400;

    // Canvas 1 shows: Player 2's doodle underneath, Player 1's finished overlay on top.
    // Canvas 2 shows: Player 1's doodle underneath, Player 2's finished overlay on top.
    const stack1 = {
        background: document.getElementById('drawing1-background').getContext('2d'),
        doodle:     document.getElementById('drawing1-doodle').getContext('2d'),
        drawing:    document.getElementById('drawing1-drawing').getContext('2d'),
        doodleStrokes:   matchData.Drawing2Doodle,
        overlayStrokes:  matchData.Drawing1Finished
    };
    const stack2 = {
        background: document.getElementById('drawing2-background').getContext('2d'),
        doodle:     document.getElementById('drawing2-doodle').getContext('2d'),
        drawing:    document.getElementById('drawing2-drawing').getContext('2d'),
        doodleStrokes:   matchData.Drawing1Doodle,
        overlayStrokes:  matchData.Drawing2Finished
    };

    function paintStack(stack) {
        // Background
        stack.background.globalCompositeOperation = 'source-over';
        stack.background.fillStyle = '#ffffff';
        stack.background.fillRect(0, 0, W, H);

        // Doodle layer (transparent base, only the opponent's doodle)
        renderDoodleStrokes(stack.doodle, stack.doodleStrokes, W, H);

        // Drawing layer (transparent base, overlay strokes on top;
        // erase strokes use destination-out and reveal the doodle beneath)
        renderDrawingStrokes(stack.drawing, stack.overlayStrokes, W, H);
    }

    paintStack(stack1);
    paintStack(stack2);

    // Checkbox: hide / show the drawing layer only.
    const drawingLayer1 = document.getElementById('drawing1-drawing');
    const drawingLayer2 = document.getElementById('drawing2-drawing');

    document.getElementById('show-doodle-checkbox').addEventListener('change', (e) => {
        const display = e.target.checked ? 'none' : 'block';
        drawingLayer1.style.display = display;
        drawingLayer2.style.display = display;
    });

    // Favorite button event
    document.querySelector('.favorite-btn').addEventListener('click', async function() {
        const matchId = this.dataset.matchId;
        const isFavorite = this.dataset.isFavorite === 'true';
        const newState = !isFavorite;

        const heartIcon = this.querySelector('.heart-icon');
        const favText = this.querySelector('.favorite-text');

        if (newState) {
            heartIcon.textContent = '❤️';
            if (favText) favText.textContent = 'Match favorited';
            this.dataset.isFavorite = 'true';
        } else {
            heartIcon.textContent = '🤍';
            if (favText) favText.textContent = 'Favorite this match';
            this.dataset.isFavorite = 'false';
        }

        try {
            const response = await fetch(`/api/favorites/${newState}/${matchId}`, {
                method: 'POST'
            });
            if (!response.ok) {
                if (newState) {
                    heartIcon.textContent = '🤍';
                    if (favText) favText.textContent = 'Favorite';
                    this.dataset.isFavorite = 'false';
                } else {
                    heartIcon.textContent = '❤️';
                    if (favText) favText.textContent = 'Favorited';
                    this.dataset.isFavorite = 'true';
                }
                alert('Failed to update favorite');
            }
        } catch (error) {
            if (newState) {
                heartIcon.textContent = '🤍';
                if (favText) favText.textContent = 'Favorite';
                this.dataset.isFavorite = 'false';
            } else {
                heartIcon.textContent = '❤️';
                if (favText) favText.textContent = 'Favorited';
                this.dataset.isFavorite = 'true';
            }
            alert('Error connecting to server');
        }
    });
}