// ===== Taskbar =====
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
                window.location.href = '/login.html';
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