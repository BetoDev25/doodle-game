// ===== Taskbar =====
window.currentUser = null;


async function getCurrentUser() {
    const response = await fetch('/api/me');
    let user = null;
    let isGuest = true;
    let username = null;
    if (response.ok) {
        user = await response.json();
        isGuest = false;
        username = user.Username;
    }
    
    // Not logged in — create guest
    if (isGuest) {
        username = localStorage.getItem('guestUsername');
        if (!username) {
            username = 'Guest' + Math.floor(Math.random() * 10000);
            localStorage.setItem('guestUsername', username);
        }
    }
    
    window.currentUser = {
        username: username,
        isGuest: isGuest,
    }
    return window.currentUser;
}

function loadTaskbar() {
    // Get username from session
    fetch('/api/me')
        .then(res => {
            if (res.ok) {
                return res.json();
            }
            throw new Error('Not logged in');
        })
        .then(user => {
            document.getElementById('taskbarUsername').textContent = `👤 ${user.username}`;
        })
        .catch(() => {
            document.getElementById('taskbarUsername').textContent = '👤 Guest';
        });
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                localStorage.removeItem('guestUsername');
                window.location.reload();
                //window.location.href = '/login.html';
            } else {
                alert('Logout failed');
            }
        } catch (error) {
            alert('Error connecting to server');
        }
    });
}

// Call on page load
document.addEventListener('DOMContentLoaded', loadTaskbar);