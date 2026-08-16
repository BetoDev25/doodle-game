// ===== Taskbar =====
window.currentUser = null;


async function getCurrentUser() {
    const response = await fetch('/api/me');
    
    if (response.ok) {
        const user = await response.json();
        window.currentUser = {
            id: user.id,
            username: user.username,
            isGuest: user.is_guest,
        };
        renderTaskbar();
        return window.currentUser;
    }

    let guestUsername = localStorage.getItem('guestUsername');
    if (!guestUsername) {
        guestUsername = `Guest${Math.floor(Math.random() * 10000)}`;
        localStorage.setItem('guestUsername', guestUsername);
    }

    // Create guest in database
    const guestRes = await fetch(`/api/guests`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: guestUsername })
    });
    
    if (guestRes.ok) {
        const guest = await guestRes.json();
        console.log('Guest response:', guest);
        window.currentUser = {
            id: guest.ID,
            username: guest.Username,
            isGuest: true,
        };
        renderTaskbar();
        return window.currentUser;
    }

    window.currentUser = {
        username: guestUsername,
        isGuest: true,
        id: null,
    };
    renderTaskbar();
    return window.currentUser;
}

function renderTaskbar() {
    const isGuest = window.currentUser?.isGuest ?? true;
    const username = window.currentUser?.username || '';

    document.getElementById('taskbar').innerHTML = `
        <div class="taskbar-left">
            <a href="/" class="taskbar-logo">🎨 Doodle Duel</a>
        </div>
        <div class="taskbar-right">
            <span id="taskbarUsername">${username ? `👤 ${username}` : ''}</span>
            <button id="authBtn" class="taskbar-btn">
                ${isGuest ? 'Login' : 'Logout'}
            </button>
        </div>
    `;

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