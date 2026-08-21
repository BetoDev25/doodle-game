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

    // Display profile info
    document.getElementById('profile-username').textContent = user.username;

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

    // Load drawings
    await loadDrawings();
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
    container.style.display = 'flex';
    container.style.gap = '20px';
    container.style.justifyContent = 'center';
    container.style.flexWrap = 'wrap';

    // Player 1 drawing
    if (matchData.drawings && matchData.drawings.length >= 1) {
        const p1Container = document.createElement('div');
        p1Container.style.textAlign = 'center';

        const canvas1 = document.createElement('canvas');
        canvas1.width = 300;
        canvas1.height = 200;
        const ctx1 = canvas1.getContext('2d');

        const strokes1 = matchData.drawings[0].finished_strokes || matchData.drawings[0].doodle_strokes;
        renderStrokesOnCanvas(ctx1, strokes1, 300, 200);

        const label1 = document.createElement('p');
        label1.textContent = matchData.drawings[0].username || 'Deleted User';
        label1.style.margin = '8px 0 0 0';

        p1Container.appendChild(canvas1);
        p1Container.appendChild(label1);
        container.appendChild(p1Container);
    }

    // Player 2 drawing
    if (matchData.drawings && matchData.drawings.length >= 2) {
        const p2Container = document.createElement('div');
        p2Container.style.textAlign = 'center';

        const canvas2 = document.createElement('canvas');
        canvas2.width = 300;
        canvas2.height = 200;
        const ctx2 = canvas2.getContext('2d');

        const strokes2 = matchData.drawings[1].finished_strokes || matchData.drawings[1].doodle_strokes;
        renderStrokesOnCanvas(ctx2, strokes2, 300, 200);

        const label2 = document.createElement('p');
        label2.textContent = matchData.drawings[1].username || 'Deleted User';
        label2.style.margin = '8px 0 0 0';

        p2Container.appendChild(canvas2);
        p2Container.appendChild(label2);
        container.appendChild(p2Container);
    }

    modalBody.appendChild(container);
}

function renderStrokesOnCanvas(ctx, strokesData, width, height) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    if (!strokesData || strokesData.length === 0) {
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No strokes', width/2, height/2);
        return;
    }

    strokesData.forEach(stroke => {
        ctx.strokeStyle = stroke.color || '#000000';
        ctx.lineWidth = stroke.size || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.points && stroke.points.length > 0) {
            ctx.beginPath();
            const first = stroke.points[0];
            ctx.moveTo(first.x * width, first.y * height);
            for (let i = 1; i < stroke.points.length; i++) {
                const point = stroke.points[i];
                ctx.lineTo(point.x * width, point.y * height);
            }
            ctx.stroke();
        }
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

function renderStrokes(ctx, strokesData, width, height) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    strokesData.forEach(stroke => {
        ctx.strokeStyle = stroke.color || '#000000';
        ctx.lineWidth = stroke.size || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.points && stroke.points.length > 0) {
            ctx.beginPath();
            const first = stroke.points[0];
            ctx.moveTo(first.x * width, first.y * height);
            for (let i = 1; i < stroke.points.length; i++) {
                const point = stroke.points[i];
                ctx.lineTo(point.x * width, point.y * height);
            }
            ctx.stroke();
        }
    });
}

async function loadDrawings() {
    try {
        const response = await fetch('/api/drawings');
        if (!response.ok) {
            console.error('Failed to load drawings');
            return;
        }

        const drawings = await response.json();
        const grid = document.getElementById('drawings-grid');

        if (drawings.length === 0) {
            grid.innerHTML = '<p>No drawings yet. Play a match to get started!</p>';
            return;
        }

        drawings.forEach(drawing => {
            const card = document.createElement('div');
            card.className = 'drawing-card';

            // Thumbnail
            const canvas = document.createElement('canvas');
            canvas.width = 200;
            canvas.height = 150;
            const ctx = canvas.getContext('2d');

            if (drawing.finished_strokes && drawing.finished_strokes.length > 0) {
                renderStrokes(ctx, drawing.finished_strokes, 200, 150);
            } else {
                ctx.fillStyle = '#eee';
                ctx.fillRect(0, 0, 200, 150);
                ctx.fillStyle = '#999';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('No strokes', 100, 75);
            }

            // Date
            const date = new Date(drawing.created_at);
            const dateStr = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const label = document.createElement('p');
            label.textContent = dateStr;

            card.addEventListener('click', async () => {
            const matchId = drawing.match_id;
            const response = await fetch(`/api/view-drawings/${matchId}`);
            const data = await response.json();
            renderModalDrawings(data);
            openModal();
        });

            card.appendChild(canvas);
            card.appendChild(label);
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading drawings:', error);
    }
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