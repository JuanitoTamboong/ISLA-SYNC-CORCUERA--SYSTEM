// Settings page - extracted from resident-homepage.js
document.addEventListener('DOMContentLoaded', function() {
    // Check if Supabase is loaded
    if (typeof supabase === 'undefined') {
        console.error('Supabase SDK not loaded');
        showNotification('Error: Supabase SDK failed to load. Please refresh.', 'error');
        return;
    }
    
    // Supabase configuration (same as resident-homepage)
    const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co'
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds'
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Check user
    const currentUser = localStorage.getItem('currentUser')
    if (!currentUser) {
        window.location.href = 'login.html'
        return
    }
    let user = JSON.parse(currentUser)
    
    // Load and update profile
    async function loadUserData() {
        try {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle()
            
            if (profile) {
                user.fullName = profile.full_name
                user.email = profile.email
                localStorage.setItem('currentUser', JSON.stringify(user))
                
                // Update profile card
                document.querySelector('.profile-card h4').textContent = user.fullName || 'User Name'
                document.querySelector('.profile-card p').textContent = user.email || 'user@example.com'
            }
        } catch (error) {
            console.error('Profile load error:', error)
        }
    }
    
    loadUserData()
    
    // Logout function - define BEFORE attaching event listener
    window.logout = async function() {
        try {
            // Show confirmation
            const confirmed = confirm('Are you sure you want to log out?')
            if (!confirmed) return
            
            // Clear all auth data
            localStorage.removeItem('currentUser')
            localStorage.removeItem('authToken')
            localStorage.removeItem('userSession')
            
            // Sign out from Supabase
            await supabaseClient.auth.signOut()
            
            showNotification('Logged out successfully', 'success')
            
            // Force redirect to login
            setTimeout(() => {
                window.location.href = 'login.html'
            }, 500)
        } catch (error) {
            console.error('Logout error:', error)
            // Even if logout fails, redirect to login
            setTimeout(() => {
                window.location.href = 'login.html'
            }, 500)
        }
    }
    
    // Back button
    document.querySelector('.header i').addEventListener('click', () => {
        window.location.href = 'resident-homepage.html'
    })
    
    // Logout button - attach AFTER function is defined
    document.querySelector('.logout').addEventListener('click', function(e) {
        e.preventDefault()
        e.stopPropagation()
        window.logout()
    })
    
    // Notification (shared)
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div')
        notification.className = `notification ${type}`
        notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i><span>${message}</span>`
        notification.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white; padding: 12px 24px; border-radius: 8px; font-size: 14px;
            z-index: 3000; display: flex; align-items: center; gap: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: 'Poppins', sans-serif;
            max-width: 90%; word-break: break-word; white-space: pre-line;
        `
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 4000)
    }
    
    // Navigation function
    window.navigateTo = function(page) {
        switch(page) {
            case 'home':
                window.location.href = 'resident-homepage.html'
                break
            case 'map':
                window.location.href = 'map.html'
                break
            case 'notifications':
                window.location.href = 'notif.html'
                break
            case 'profile':
                window.location.href = 'profile.html'
                break
            case 'settings':
                // Stay on current page
                break
        }
    }
    
    // Bottom nav home (redundant but kept for direct handler)
    document.querySelector('.nav-item i.fa-home').parentElement.onclick = () => {
        window.location.href = 'resident-homepage.html'
    }
    
    console.log('Settings loaded')
})
