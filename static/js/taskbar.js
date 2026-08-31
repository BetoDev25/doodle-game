// ===== Taskbar =====
window.currentUser = null;


function renderTaskbar() {
    const isGuest = window.currentUser?.isGuest ?? true;
    const username = window.currentUser?.username || '';
    const userId = window.currentUser?.id || '';

    document.getElementById('taskbar').innerHTML = `
        <div class="taskbar-left">
            <a href="/" class="taskbar-logo">🎨 Doodle Duel</a>
        </div>
        <div class="taskbar-right">
            <div style="display:flex; align-items:center; gap:10px;">
                <!-- Avatar -->
                <div id="taskbar-avatar" style="width:32px; height:32px; overflow:hidden; border:2px solid #ddd; background:#4A90D9; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:14px;">
                    <img id="taskbar-avatar-img" width="32" height="32" alt="Avatar" style="object-fit:cover;">
                </div>
                <!-- Username link -->
                <a href="/profile/${window.currentUser.username}/matches/1" id="taskbarUsername" style="color:white; text-decoration:none; font-size:14px;">
                    ${username ? `${username}` : ''}
                </a>
                <button id="authBtn" class="taskbar-btn">
                    ${isGuest ? 'Login' : 'Logout'}
                </button>
            </div>
        </div>
    `;

    // Render avatar
    const avatarImg = document.getElementById('taskbar-avatar-img');
    if (window.currentUser?.avatar_path) {
        avatarImg.src = window.currentUser.avatar_path + '?t=' + Date.now();
    } else {
        // Fallback: initials
        avatarImg.style.display = 'none';
        const canvas = document.getElementById('taskbar-avatar-canvas');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#4A90D9';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(username ? username[0].toUpperCase() : '?', 16, 16);
    }

    document.getElementById('authBtn').addEventListener('click', () => {
        if (isGuest) {
            window.location.href = '/login.html';
        } else {
            handleLogout();
        }
    });
}

async function handleLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            localStorage.removeItem('guestUsername');
            window.currentUser = null;
            window.location.reload();
        } else {
            alert('Logout failed');
        }
    } catch (error) {
        alert('Error connecting to server');
    }
}

// Call on page load
document.addEventListener('DOMContentLoaded', async () => {
    await getCurrentUser();
    renderTaskbar();
});