// Navigation script for notif.html - matches resident-homepage.js/map.js/setting.js pattern
document.addEventListener('DOMContentLoaded', function() {
    // Global navigateTo function for bottom nav onclick handlers
    window.navigateTo = function(page) {
        switch(page) {
            case 'home':
                window.location.href = '../pages/resident-homepage.html';
                break;
            case 'map':
                window.location.href = '../pages/map.html';
                break;
            case 'notifications':
                // Stay on current page
                break;
            case 'settings':
                window.location.href = '../pages/setting.html';
                break;
        }
    };

    console.log('Notif navigation loaded');
});
