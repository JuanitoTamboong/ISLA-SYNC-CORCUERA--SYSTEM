// Admin Settings Script
document.addEventListener('DOMContentLoaded', function() {
    if (typeof supabase === 'undefined') {
        showNotification('Error: Supabase SDK failed to load. Please refresh.', 'error');
        return;
    }

    const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Check admin session
    const currentAdminStr = localStorage.getItem('currentAdmin');
    if (!currentAdminStr) {
        window.location.href = 'admin-login.html';
        return;
    }

    let admin;
    try {
        admin = JSON.parse(currentAdminStr);
        if (!admin || !admin.id || admin.userType !== 'admin') {
            throw new Error('Invalid admin');
        }
    } catch (e) {
        localStorage.removeItem('currentAdmin');
        window.location.href = 'admin-login.html';
        return;
    }

    // Load admin data
    document.getElementById('profileName').textContent = admin.fullName || 'Admin';
    document.getElementById('profileEmail').textContent = admin.email || 'admin@islasync.gov';

    // Navigation
    window.navigateTo = function(page) {
        switch(page) {
            case 'home':
                window.location.href = 'admin-homepage.html';
                break;
            case 'map':
                window.location.href = 'admin-map.html';
                break;
            case 'news':
                window.location.href = 'admin-news.html';
                break;
            case 'settings':
                // Already here
                break;
        }
    };

    window.goBack = function() {
        window.location.href = 'admin-homepage.html';
    };

    window.goToProfile = function() {
        window.location.href = 'admin-profile.html';
    };

    // Logout
    window.logout = async function() {
        try {
            const confirmed = confirm('Are you sure you want to log out?');
            if (!confirmed) return;

            localStorage.removeItem('currentAdmin');
            localStorage.removeItem('authToken');
            localStorage.removeItem('userSession');

            await supabaseClient.auth.signOut();

            showNotification('Logged out successfully', 'success');

            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 500);
        } catch (error) {
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 500);
        }
    };

    // Back button
    document.querySelector('.header i.fa-chevron-left').addEventListener('click', () => {
        window.location.href = 'admin-homepage.html';
    });

    // Logout button
    document.querySelector('.logout').addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        window.logout();
    });

    // Notification function
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i><span>${message}</span>`;
        notification.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white; padding: 12px 24px; border-radius: 8px; font-size: 14px;
            z-index: 3000; display: flex; align-items: center; gap: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: 'Poppins', sans-serif;
            max-width: 90%; word-break: break-word; white-space: pre-line;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }
});
