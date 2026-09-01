let userFavorites = [];

document.getElementById('modal-close').addEventListener('click', closeModal);

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for user to be loaded
    if (!window.currentUser) {
        await getCurrentUser();
    }

    const user = window.currentUser;
    if (!user || user.isGuest) {
        // Redirect guests to login
        window.location.href = '/login.html';
        return;
    }
    
    await loadFavorites();

    // Display profile info
    document.getElementById('profile-username').textContent = user.username;

    // Get URL params
    const pathParts = window.location.pathname.split('/');
    const username = pathParts[2] || user.username;
    const section = pathParts[3] || 'matches';
    const currentPage = parseInt(pathParts[4]) || 1;

    document.title = `${username}'s Profile`;

    // Update mini-nav active state
    document.querySelectorAll('.mini-nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-section') === section) {
            link.classList.add('active');
        }
    });

    // Update mini-nav links
    const matchesLink = document.querySelector('.mini-nav-link-matches');
    const favoritesLink = document.querySelector('.mini-nav-link-favorites');

    if (matchesLink) {
        matchesLink.href = `/profile/${username}/matches/${currentPage}`;
    }
    if (favoritesLink) {
        favoritesLink.href = `/profile/${username}/favorites/${currentPage}`;
    }

    // Format created_at (if available)
    if (user.created_at) {
        const date = new Date(user.created_at);
        document.getElementById('profile-created').textContent = `Joined: ${date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}`;
    }

    // Display bio
    document.getElementById('profile-bio').textContent = user.bio || '';

    // Render avatar
    renderAvatar(user);

    let data = null;
    let title = '';

    if (section === 'favorites') {
        data = await getRecentFavorites(username, currentPage);
        title = 'Favorite Matches';
        if (data) {
            renderDrawings(data, title);
        }
    } else if (section === 'matches') {
        data = await getRecentMatchesByUsername(username, currentPage);
        title = 'Recent Matches';
        if (data) {
            renderDrawings(data, title);
        }
    }

    //TO-DO: Implement 404 page
});

document.getElementById('avatar-edit-btn').addEventListener('click', () => {
    document.getElementById('avatar-input').click();
});

document.getElementById('avatar-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    const submitBtn = document.getElementById('avatar-edit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Uploading...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/avatar/update', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        const data = await response.json();

        const avatarImg = document.getElementById('avatar-img');
        avatarImg.src = data.path + '?t=' + Date.now();

        alert('Avatar uploaded successfully!');

    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload avatar: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        e.target.value = ''; // Clear input
    }
});

function renderModalDrawings(matchData) {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = '';

    // Create container for both drawings
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.display = 'flex';
    container.style.gap = '20px';
    container.style.justifyContent = 'center';
    container.style.flexWrap = 'wrap';
    container.style.paddingTop = '40px';

    // --- Heart Icon (Top Left) ---
    const heartContainer = document.createElement('div');
    heartContainer.style.position = 'absolute';
    heartContainer.style.top = '0';
    heartContainer.style.left = '0';
    heartContainer.style.cursor = 'pointer';
    heartContainer.style.fontSize = '28px';
    heartContainer.style.display = 'flex';
    heartContainer.style.alignItems = 'center';
    heartContainer.style.gap = '8px';
    heartContainer.title = matchData.is_favorite ? 'Unfavorite this match' : 'Favorite this match';

    const heartIcon = document.createElement('span');
    heartIcon.id = 'modal-heart-icon';
    heartIcon.textContent = matchData.is_favorite ? '❤️' : '🤍';

    heartContainer.appendChild(heartIcon);
    container.appendChild(heartContainer);

    // --- Heart click ---
    heartContainer.addEventListener('click', async () => {
        const matchId = matchData.match_id;
        const isFavorite = matchData.is_favorite || false;
        const newState = !isFavorite;

        // Optimistic UI update
        heartIcon.textContent = newState ? '❤️' : '🤍';
        heartContainer.title = newState ? 'Unfavorite this match' : 'Favorite this match';
        matchData.is_favorite = newState;

        if (newState) {
            userFavorites.push(matchId);
        } else {
            userFavorites = userFavorites.filter(id => id !== matchId);
        }

        try {
            const response = await fetch(`/api/favorites/${newState}/${matchId}`, {
                method: 'POST'
            });
            if (!response.ok) {
                // Revert on error
                heartIcon.textContent = isFavorite ? '❤️' : '🤍';
                heartContainer.title = isFavorite ? 'Unfavorite this match' : 'Favorite this match';
                matchData.is_favorite = isFavorite;

                if (isFavorite) {
                    userFavorites.push(matchId);
                } else {
                    userFavorites = userFavorites.filter(id => id !== matchId);
                }

                alert('Failed to update favorite');
            }
        } catch (error) {
            heartIcon.textContent = isFavorite ? '❤️' : '🤍';
            heartContainer.title = isFavorite ? 'Unfavorite this match' : 'Favorite this match';
            matchData.is_favorite = isFavorite;

            if (isFavorite) {
                userFavorites.push(matchId);
            } else {
                userFavorites = userFavorites.filter(id => id !== matchId);
            }

            alert('Error connecting to server');
        }
    });

    // Player 1 drawing
    const p1Container = document.createElement('div');
    p1Container.style.textAlign = 'center';

    const canvas1 = document.createElement('canvas');
    canvas1.width = 500;
    canvas1.height = 400;
    const ctx1 = canvas1.getContext('2d');

    //const strokes1 = parseStrokes(matchData.drawing1_finished || matchData.drawing1_doodle);
    //renderStrokesOnCanvas(ctx1, strokes1, 500, 400);

    const label1 = document.createElement('p');
    label1.textContent = matchData.drawing1_username || 'Deleted User';
    label1.style.margin = '8px 0 0 0';

    p1Container.appendChild(canvas1);
    p1Container.appendChild(label1);
    container.appendChild(p1Container);

    // Player 2 drawing
    const p2Container = document.createElement('div');
    p2Container.style.textAlign = 'center';

    const canvas2 = document.createElement('canvas');
    canvas2.width = 500;
    canvas2.height = 400;
    const ctx2 = canvas2.getContext('2d');

    //const strokes2 = parseStrokes(matchData.drawing2_finished || matchData.drawing2_doodle);
    //renderStrokesOnCanvas(ctx2, strokes2, 500, 400);

    const label2 = document.createElement('p');
    label2.textContent = matchData.drawing2_username || 'Deleted User';
    label2.style.margin = '8px 0 0 0';

    p2Container.appendChild(canvas2);
    p2Container.appendChild(label2);
    container.appendChild(p2Container);

    modalBody.appendChild(container);

    // --- Checkbox (Bottom) ---
    const checkboxContainer = document.createElement('div');
    checkboxContainer.className = 'modal-checkbox-container';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'show-doodle-checkbox';

    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = 'show-doodle-checkbox';
    checkboxLabel.textContent = 'Show Doodle';

    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(checkboxLabel);
    container.appendChild(checkboxContainer);

    // Function to render the drawings
    function renderDrawings(showDoodle) {
        const strokes1 = parseStrokes(
            showDoodle ? matchData.drawing2_doodle : matchData.drawing1_finished
        );
        const strokes2 = parseStrokes(
            showDoodle ? matchData.drawing1_doodle : matchData.drawing2_finished
        );
        renderStrokesOnCanvas(ctx1, strokes1, 500, 400);
        renderStrokesOnCanvas(ctx2, strokes2, 500, 400);
    }

    renderDrawings(false);

    checkbox.addEventListener('change', (e) => {
        renderDrawings(e.target.checked);
    });
}

function renderAvatar(user) {
    const avatarImg = document.getElementById('avatar-img');

    if (user.avatar_path) {
        avatarImg.src = user.avatar_path + '?t=' + Date.now();
        avatarImg.style.display = 'block';
    } else {
        // Fallback: colored square
        avatarImg.src = '/avatars/default.png';
        avatarImg.style.display = 'block';
    }
}

function renderDrawings(data, title) {
    const grid = document.getElementById('drawings-grid');
    
    // data is the full API response object
    const items = data.matches || data.favorites || [];
    const totalPages = data.total_pages || 0;
    const currentPage = data.current_page || 1;
    const username = data.username || '';

    if (items.length === 0) {
        grid.innerHTML = `<h2>${title}</h2><p>No drawings yet.</p>`;
        return;
    }

    let html = `<h2>${title}</h2><div class="drawings-grid-container">`;
    
    items.forEach(item => {
        let dateStr = 'Unknown date';
        if (item.MatchCreatedAt) {
            try {
                // It's a string, so just use it directly
                const timeStr = item.MatchCreatedAt.replace('Z', '');
                const date = new Date(timeStr);
                if (!isNaN(date.getTime())) {
                    dateStr = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
            } catch (e) {
                console.error('Invalid date:', item.MatchCreatedAt, e);
            }
        }

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
            const section = window.location.pathname.split('/')[3];
            window.location.href = `/profile/${username}/${section}/${page}`;
        });
    });

    // Render thumbnails
    document.querySelectorAll('.drawing-card').forEach((card, index) => {
        const canvas = card.querySelector('.drawing-thumbnail');
        const ctx = canvas.getContext('2d');
        const item = items[index];
        
        // Use camelCase field names from backend
        let strokes;
        if (item.Drawing1UserID === username) {
            strokes = item.Drawing1Finished || item.Drawing1Doodle;
        } else if (item.Drawing2UserID === username) {
            strokes = item.Drawing2Finished || item.Drawing2Doodle;
        } else {
            strokes = item.Drawing1Finished || item.Drawing1Doodle;
        }
        
        renderStrokes(ctx, strokes, 200, 150);
        
        card.addEventListener('click', () => {
            const matchData = {
            match_id: item.MatchID,
            drawing1_user_id: item.Drawing1UserID,
            drawing1_username: (item.Player1Username && typeof item.Player1Username === 'object') 
                ? (item.Player1Username.String || 'Deleted User') 
                : (item.Player1Username || 'Deleted User'),
            drawing1_doodle: item.Drawing1Doodle,
            drawing1_finished: item.Drawing1Finished,
            drawing2_user_id: item.Drawing2UserID,
            drawing2_username: (item.Player2Username && typeof item.Player2Username === 'object') 
                ? (item.Player2Username.String || 'Deleted User') 
                : (item.Player2Username || 'Deleted User'),
            drawing2_doodle: item.Drawing2Doodle,
            drawing2_finished: item.Drawing2Finished
        };
            matchData.is_favorite = userFavorites.includes(item.MatchID);
            renderModalDrawings(matchData);
            openModal();
        });
    });
}

function renderPagination(currentPage, totalPages) {
    const grid = document.getElementById('drawings-grid');
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        if (i === currentPage) btn.classList.add('active');
        btn.addEventListener('click', () => {
            window.location.href = `/profile/${username}/${section}/${i}`;
        });
        paginationDiv.appendChild(btn);
    }
    
    grid.appendChild(paginationDiv);
}

function openModal() {
    document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

// Close when clicking outside
document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// Close with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
});