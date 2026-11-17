// ===== Taskbar =====
window.currentUser = null;
let currentUserPromise = null;
let notificationsCache = [];
let unreadCount = 0;

function renderTaskbar() {
    const isGuest = window.currentUser?.isGuest ?? true;
    const username = window.currentUser?.username || '';
    const userId = window.currentUser?.id || '';

    document.getElementById('taskbar').innerHTML = `
        <div class="taskbar-left">
            <a href="/" class="taskbar-logo">Sketch Switch</a>
        </div>
        <div class="taskbar-right">
            <a href="/play/" class="taskbar-logo">Play</a>
            <a href="/drawing/" class="taskbar-logo">Sandbox</a>
            ${isGuest ? `
                <div style="display:flex; align-items:center; gap:10px;">
                    <a href="/login.html" class="taskbar-btn taskbar-btn-login">Login</a>
                    <a href="/signup/" class="taskbar-btn taskbar-btn-signup">Sign Up</a>
                </div>
            ` : `
                <div style="display:flex; align-items:center; gap:10px;">
                    <!-- Avatar -->
                    <div id="taskbar-avatar" style="width:32px; height:32px; overflow:hidden; border:2px solid #ddd; background:#4A90D9; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:14px;">
                        <img id="taskbar-avatar-img" width="32" height="32" alt="Avatar" style="object-fit:cover;">
                    </div>
                    <!-- Username link -->
                    <a href="/profile/${window.currentUser.username}/matches/1" id="taskbarUsername" style="color:white; text-decoration:none; font-size:14px;">
                        ${username ? `${username}` : ''}
                    </a>
                    <!-- Notification Bell-->
                    <div class="notif-wrapper">
                        <button id="notifBell" class="notif-bell" title="Notifications">
                            🔔<span id="notifCount" class="notif-count" style="display:none;">0</span>
                        </button>
                        <div id="notifDropdown" class="notif-dropdown" style="display:none;">
                            <div id="notifList" class="notif-list">
                                <p class="notif-empty">No notifications for now</p>
                            </div>
                        </div>
                    </div>

                    <button id="authBtn" class="taskbar-btn taskbar-btn-logout">
                        Logout
                    </button>
                </div>
            `}
        </div>
    `;

    // Render avatar for logged-in users
    if (!isGuest) {
        wireNotificationBell();
        const avatarImg = document.getElementById('taskbar-avatar-img');
        if (window.currentUser?.avatar_path) {
            avatarImg.src = window.currentUser.avatar_path + '?t=' + Date.now();
        } else {
            avatarImg.style.display = 'none';
            const canvas = document.getElementById('taskbar-avatar-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#4A90D9';
                ctx.fillRect(0, 0, 32, 32);
                ctx.fillStyle = 'white';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(username ? username[0].toUpperCase() : '?', 16, 16);
            }
        }

        document.getElementById('authBtn').addEventListener('click', () => {
            handleLogout();
        });
    }
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

async function getCurrentUser() {
    // If we already have a user, return it
    if (window.currentUser) {
        return window.currentUser;
    }
    
    // If there's already a promise in progress, return it
    if (currentUserPromise) {
        return currentUserPromise;
    }

    currentUserPromise = (async () => {
        try {
            const response = await fetch('/api/me');
            
            if (response.ok) {
                const user = await response.json();
                window.currentUser = {
                    id: user.id,
                    username: user.username,
                    isGuest: user.is_guest,
                    created_at: user.created_at,
                    bio: user.bio,
                    avatar_path: user.avatar_path || '/avatars/default.png',
                };
                // Store the actual username from the server
                localStorage.setItem('guestUsername', user.username);
                return window.currentUser;
            }

            let guestUsername = localStorage.getItem('guestUsername');
            
            // If we have a guest username stored, use it
            // But also check if this guest already exists by trying to get it
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
                // Store the exact username from the server
                localStorage.setItem('guestUsername', guest.username);
                window.currentUser = {
                    id: guest.ID,
                    username: guest.username,
                    isGuest: true,
                    avatar_path: guest.avatar_path || '/avatars/default.png',
                };
                return window.currentUser;
            }

            window.currentUser = {
                username: guestUsername,
                isGuest: true,
                id: null,
            };
            return window.currentUser;
        } finally {
            currentUserPromise = null;
        }
    })();

    return currentUserPromise;
}

function wireNotificationBell() {
    const bell = document.getElementById('notifBell');
    const dropdown = document.getElementById('notifDropdown');
    if (!bell || !dropdown) return;

    bell.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdown.style.display === 'block';
        dropdown.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) renderNotifications();
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !bell.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

function renderNotifications() {
    const list = document.getElementById('notifList');
    if (!list) return;

    if (notificationsCache.length === 0) {
        list.innerHTML = `<p class="notif-empty">No notifications for now</p>`;
        return;
    }

    list.innerHTML = notificationsCache.map(n => `
        <a class="notif-item ${n.is_read ? 'read' : 'unread'}" href="${n.link || '#'}">
            <div class="notif-body">${n.body}</div>
            <div class="notif-time">${formatNotifTime(n.created_at)}</div>
        </a>
    `).join('');
}

function formatNotifTime(ts) {
    const d = new Date(ts);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

async function fetchNotifications() {
    try {
        const res = await fetch('/api/notifications', { credentials: 'same-origin' });
        if (!res.ok) return;                      // 401 for guests — just skip
        const data = await res.json();
        notificationsCache = data.notifications || [];
        unreadCount = data.unread_count || 0;
        updateNotifCount();
        if (document.getElementById('notifDropdown')?.style.display === 'block') {
            renderNotifications();
        }
    } catch (_) { /* network failure — leave cache as-is */ }
}

function updateNotifCount() {
    const el = document.getElementById('notifCount');
    if (!el) return;
    el.textContent = unreadCount;
    el.style.display = unreadCount > 0 ? '' : 'none';
}

// Call on page load
document.addEventListener('DOMContentLoaded', async () => {
    await getCurrentUser();
    renderTaskbar();
    if (window.currentUser && !window.currentUser.isGuest) {
        await fetchNotifications();
    }
});