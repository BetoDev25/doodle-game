document.addEventListener('DOMContentLoaded', async () => {
    // Get URL params
    const pathParts = window.location.pathname.split('/');
    const username = pathParts[2]; // /profile/{username}
    const section = pathParts[3] || 'matches';
    const currentPage = parseInt(pathParts[4]) || 1;

    if (!username) {
        window.location.href = '/error?message=' + encodeURIComponent('Invalid profile URL');
        return;
    }

    // Fetch user info by username
    try {
        const response = await fetch(`/api/users/${username}`);
        if (!response.ok) {
            if (response.status === 404) {
                window.location.replace = `/error?message=${encodeURIComponent('User not found')}`;
                return;
            }
            throw new Error('Failed to fetch user');
        }
        const userData = await response.json();

        // Set the user data for this profile
        window.profileUser = userData;

        // Display profile info
        document.getElementById('profile-username').textContent = userData.username;
        document.title = `${userData.username}'s Profile`;

        // Format created_at
        if (userData.created_at) {
            const date = new Date(userData.created_at);
            document.getElementById('profile-created').textContent = `Joined: ${date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}`;
        }

        // Display bio
        document.getElementById('profile-bio').textContent = userData.bio || '';

        // Render avatar
        renderAvatar(userData);

        // Show/hide avatar edit button (only for the profile owner)
        const currentUser = window.currentUser;
        const avatarEditBtn = document.getElementById('avatar-edit-btn');
        if (avatarEditBtn) {
            if (currentUser && currentUser.username === username) {
                avatarEditBtn.style.display = 'inline-block';
            } else {
                avatarEditBtn.style.display = 'none';
            }
        }

        // Update mini-nav links
        document.querySelectorAll('.mini-nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === section) {
                link.classList.add('active');
            }
        });

        const matchesLink = document.querySelector('.mini-nav-link-matches');
        const favoritesLink = document.querySelector('.mini-nav-link-favorites');

        if (matchesLink) {
            matchesLink.href = `/profile/${username}/matches/${currentPage}`;
        }
        if (favoritesLink) {
            favoritesLink.href = `/profile/${username}/favorites/${currentPage}`;
        }

        // Load matches or favorites
        let data = null;
        let title = '';

        if (section === 'favorites') {
            data = await getRecentFavorites(username, currentPage);
            title = 'Favorite Matches';
            if (data) {
                renderDrawings(data, title, window.profileUser?.id);
            }
        } else if (section === 'matches') {
            data = await getRecentMatchesByUsername(username, currentPage);
            title = 'Recent Matches';
            if (data) {
                renderDrawings(data, title, window.profileUser?.id);
            }
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        window.location.replace = `/error?message=${encodeURIComponent('Error loading profile')}`;
    }
});

// Avatar upload (only visible to profile owner)
document.getElementById('avatar-edit-btn')?.addEventListener('click', () => {
    document.getElementById('avatar-input').click();
});

document.getElementById('avatar-input')?.addEventListener('change', async (e) => {
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
        e.target.value = '';
    }
});

function renderAvatar(user) {
    const avatarImg = document.getElementById('avatar-img');

    if (user.avatar_path) {
        avatarImg.src = user.avatar_path + '?t=' + Date.now();
        avatarImg.style.display = 'block';
    } else {
        avatarImg.src = '/avatars/default.png';
        avatarImg.style.display = 'block';
    }
}

function renderDrawings(data, title, profileUserId) {
    const grid = document.getElementById('drawings-grid');

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

        // Pagination
    html += `<div class="pagination">`;

    // Prev button — only if not on page 1
    if (currentPage > 1) {
        html += `<button class="page-btn page-nav" data-page="${currentPage - 1}">&lt;</button>`;
    }

    // Numbered page buttons
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    // Next button — always rendered, clamps to last page
    const nextPage = Math.min(currentPage + 1, totalPages);
    html += `<button class="page-btn page-nav" data-page="${nextPage}">&gt;</button>`;

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
    const W = 200;
    const H = 150;

    document.querySelectorAll('.drawing-card').forEach((card, index) => {
        const item = items[index];

        const bgCtx     = card.querySelector('.thumbnail-background').getContext('2d');
        const doodleCtx = card.querySelector('.thumbnail-doodle').getContext('2d');
        const drawCtx   = card.querySelector('.thumbnail-drawing').getContext('2d');

        // Identify which side the profile owner played, then pair their
        // finished overlay with the doodle they were given.
        let doodleStrokes, overlayStrokes;

        if (item.Drawing1UserID === profileUserId) {
            // Profile owner is Player 1: their overlay sits on Player 2's doodle.
            doodleStrokes  = item.Drawing2Doodle;
            overlayStrokes = item.Drawing1Finished;
        } else if (item.Drawing2UserID === profileUserId) {
            // Profile owner is Player 2: their overlay sits on Player 1's doodle.
            doodleStrokes  = item.Drawing1Doodle;
            overlayStrokes = item.Drawing2Finished;
        } else {
            // Couldn't identify the profile owner in this match — fall back
            // to Player 1's drawing on Player 2's doodle.
            doodleStrokes  = item.Drawing2Doodle;
            overlayStrokes = item.Drawing1Finished;
        }

        // Background
        bgCtx.globalCompositeOperation = 'source-over';
        bgCtx.fillStyle = '#ffffff';
        bgCtx.fillRect(0, 0, W, H);

        // Doodle layer
        renderDoodleStrokes(doodleCtx, doodleStrokes, W, H);

        // Drawing layer
        renderDrawingStrokes(drawCtx, overlayStrokes, W, H);

        card.addEventListener('click', () => {
            window.location.href = `/match/${item.MatchID}`;
        });
    });
}