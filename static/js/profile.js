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
    console.log("Checking to see if there's a date...");
    console.log("user.created_at:", user.created_at);
    if (user.created_at) {
        const date = new Date(user.created_at);
        console.log(`User date: ${date}`);
        document.getElementById('profile-created').textContent = `Joined: ${date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}`;
    }

    // Render avatar
    renderAvatar(user);

    // Load drawings
    await loadDrawings();
});

function renderAvatar(user) {
    const canvas = document.getElementById('avatarCanvas');
    const ctx = canvas.getContext('2d');

    if (user.profile_strokes && user.profile_strokes.length > 0) {
        renderStrokes(ctx, user.profile_strokes, canvas.width, canvas.height);
    } else {
        // Fallback: colored square
        ctx.fillStyle = '#ccc';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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

            card.appendChild(canvas);
            card.appendChild(label);
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error loading drawings:', error);
    }
}