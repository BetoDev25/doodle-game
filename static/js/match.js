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
            throw new Error('Match not found');
        }
        const data = await response.json();
        renderMatchPage(data);
    } catch (error) {
        console.error('Error loading match:', error);
        document.getElementById('match-container').innerHTML = '<p>Match not found</p>';
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
            </button>
            <div class="match-drawings">
                <div class="drawing-wrapper">
                    <h3>${matchData.Player1Username || 'Deleted User'}</h3>
                    <canvas id="drawing1" width="500" height="400"></canvas>
                </div>
                <div class="drawing-wrapper">
                    <h3>${matchData.Player2Username || 'Deleted User'}</h3>
                    <canvas id="drawing2" width="500" height="400"></canvas>
                </div>
            </div>
            <div class="match-checkbox">
                <input type="checkbox" id="show-doodle-checkbox">
                <label for="show-doodle-checkbox">Show Doodle</label>
            </div>
        </div>
    `;

    // Render the drawings
    const canvas1 = document.getElementById('drawing1');
    const ctx1 = canvas1.getContext('2d');
    const canvas2 = document.getElementById('drawing2');
    const ctx2 = canvas2.getContext('2d');

    let showDoodle = false;

    function renderDrawings(showDoodle) {
        const strokes1 = parseStrokes(
            showDoodle ? matchData.Drawing2Doodle : matchData.Drawing1Finished
        );
        const strokes2 = parseStrokes(
            showDoodle ? matchData.Drawing1Doodle : matchData.Drawing2Finished
        );
        renderStrokesOnCanvas(ctx1, strokes1, 500, 400);
        renderStrokesOnCanvas(ctx2, strokes2, 500, 400);
    }

    renderDrawings(false);

    // Checkbox event
    document.getElementById('show-doodle-checkbox').addEventListener('change', (e) => {
        renderDrawings(e.target.checked);
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
            favText.textContent = 'Favorited';
            this.dataset.isFavorite = 'true';
        } else {
            heartIcon.textContent = '🤍';
            favText.textContent = 'Favorite';
            this.dataset.isFavorite = 'false';
        }

        try {
            const response = await fetch(`/api/favorites/${newState}/${matchId}`, {
                method: 'POST'
            });
            if (!response.ok) {
                if (newState) {
                    heartIcon.textContent = '🤍';
                    favText.textContent = 'Favorite';
                    this.dataset.isFavorite = 'false';
                } else {
                    heartIcon.textContent = '❤️';
                    favText.textContent = 'Favorited';
                    this.dataset.isFavorite = 'true';
                }
                alert('Failed to update favorite');
            }
        } catch (error) {
            if (newState) {
                heartIcon.textContent = '🤍';
                favText.textContent = 'Favorite';
                this.dataset.isFavorite = 'false';
            } else {
                heartIcon.textContent = '❤️';
                favText.textContent = 'Favorited';
                this.dataset.isFavorite = 'true';
            }
            alert('Error connecting to server');
        }
    });
}