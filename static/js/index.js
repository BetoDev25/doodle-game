document.addEventListener('DOMContentLoaded', async () => {
    // Wait for taskbar to load the user
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // If user is already logged in, redirect to main page
    const user = window.currentUser;
    if (user && !user.isGuest) {
        window.location.href = '/main/';
        return;
    }
});