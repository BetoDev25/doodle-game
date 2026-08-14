// ===== Taskbar =====
window.currentUser = null;


async function getCurrentUser() {
    console.log('🔄 getCurrentUser called');
    
    const response = await fetch('/api/me');
    console.log('📡 /api/me response status:', response.status);
    
    if (response.ok) {
        const user = await response.json();
        console.log('✅ User logged in:', user);
        window.currentUser = {
            id: user.id,
            username: user.username,
            isGuest: user.is_guest,
        };
        console.log('📦 window.currentUser set:', window.currentUser);
        return window.currentUser;
    }

    console.log('❌ Not logged in, checking for guest...');

    let guestUsername = localStorage.getItem('guestUsername');
    if (!guestUsername) {
        guestUsername = `Guest${Math.floor(Math.random() * 10000)}`;
        localStorage.setItem('guestUsername', guestUsername);
        console.log('🆕 New guest username generated:', guestUsername);
    } else {
        console.log('♻️ Existing guest username found:', guestUsername);
    }

    // Create guest in database
    console.log('📡 Calling /api/guests...');
    const guestRes = await fetch(`/api/guests`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: guestUsername })
    });
    console.log('📡 /api/guests response status:', guestRes.status);
    
    if (guestRes.ok) {
        const guest = await guestRes.json();
        console.log('✅ Guest created:', guest);
        window.currentUser = {
            id: guest.id,
            username: guest.username,
            isGuest: true,
        };
        console.log('📦 window.currentUser set:', window.currentUser);
        return window.currentUser;
    }

    console.error('❌ Failed to create guest, falling back to localStorage');
    window.currentUser = {
        username: guestUsername,
        isGuest: true,
        id: null,
    };
    console.log('📦 window.currentUser (fallback):', window.currentUser);
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
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Page loaded, initializing taskbar...');
    await getCurrentUser();
    console.log('🏁 Current user:', window.currentUser);
});