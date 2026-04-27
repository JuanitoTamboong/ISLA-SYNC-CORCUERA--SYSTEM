// Wait for DOM and Supabase to load
document.addEventListener('DOMContentLoaded', function() {
    // Check if Supabase is loaded
    if (typeof supabase === 'undefined') {
        showNotification('Error: Supabase SDK failed to load. Please refresh the page.', 'error');
        return;
    }
    
    // Supabase configuration
    const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co'
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds'
    
    // Initialize Supabase client
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Check if user is logged in with id validation
    const currentUser = localStorage.getItem('currentUser')
    
    if (!currentUser) {
        window.location.href = '../pages/login.html'
        return
    }
    
    let user;
    try {
        user = JSON.parse(currentUser)
        if (!user || !user.id) {
            localStorage.removeItem('currentUser')
            window.location.href = '../pages/login.html'
            return
        }
    } catch (e) {
        localStorage.removeItem('currentUser')
        window.location.href = '../pages/login.html'
        return
    }
    
    // Verify user is a resident
    if (user.userType !== 'resident') {
        window.location.href = '../pages/admin-dashboard.html'
        return
    }
    
    // Verify session with Supabase
    async function verifySession() {
        try {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
            
            if (sessionError || !session) {
                localStorage.removeItem('currentUser')
                window.location.href = '../pages/login.html'
                return false
            }
            
            if (session.user.id !== user.id) {
                localStorage.removeItem('currentUser')
                window.location.href = '../pages/login.html'
                return false
            }
            
            return true
        } catch (error) {
            return false
        }
    }
    
    // Load user data from Supabase
    async function loadUserData() {
        try {
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle()
            
            if (profileError) {
                updateUserInterface(user)
                return
            }
            
            if (profile) {
                user = {
                    ...user,
                    fullName: profile.full_name,
                    email: profile.email,
                    userType: profile.user_type,
                    is_active: profile.is_active,
                    photo: profile.avatar_url
                }
                localStorage.setItem('currentUser', JSON.stringify(user))
                
                if (!profile.is_active) {
                    showNotification('Your account has been deactivated.', 'error')
                    setTimeout(() => logout(), 2000)
                    return
                }
                
                updateUserInterface(user)
                updateProfileImage(user)
                updateGreeting()
            }
        } catch (error) {
            updateUserInterface(user)
        }
    }
    
    // Immediately show cached profile image
    updateProfileImage(user)

    // Load latest news for Community Updates
    async function loadCommunityUpdates() {
        try {
            const { data: newsData, error } = await supabaseClient
                .from('news')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);

            if (error) {
                console.error('Load community updates error:', error);
                return;
            }

            const updatesContainer = document.getElementById('communityUpdates');
            if (!updatesContainer) return;

            if (!newsData || newsData.length === 0) {
                // Keep default if no news
                return;
            }

            const categoryIcons = {
                'Advisory': 'fa-bullhorn',
                'Tourism': 'fa-map-location-dot',
                'Events': 'fa-calendar-days',
                'Community': 'fa-users'
            };

            const html = newsData.map(news => {
                const icon = categoryIcons[news.category] || 'fa-bullhorn';
                const shortTitle = news.title.length > 40 
                    ? news.title.substring(0, 40) + '...' 
                    : news.title;
                
                return `
                    <div class="update-card" onclick="window.location.href='../pages/news.html'" style="cursor: pointer;">
                        <div class="update-icon">
                            <i class="fa ${icon}"></i>
                        </div>
                        <div class="update-text">
                            <p class="title">${escapeHtml(news.category || 'Update')}</p>
                            <span>${escapeHtml(shortTitle)}</span>
                        </div>
                    </div>
                `;
            }).join('');

            updatesContainer.innerHTML = html;

        } catch (error) {
            console.error('Community updates error:', error);
        }
    }

    // Escape HTML helper
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Load community updates after user data is loaded
    verifySession().then(isValid => {
        if (isValid) {
            loadUserData().then(() => {
                loadCommunityUpdates();
            });
        }
    });
    
    // Banner image shuffle
    const bannerImages = [
        '../assets/generate background image of corquera romblon.jpg',
        '../assets/generate background image of corquera romblon (1).jpg',
        '../assets/generate background image of corquera romblon (2).jpg',
        '../assets/generate background image of corquera romblon sea-7.jpg',
        '../assets/generate background of corquera romblon.jpg',
        '../assets/generate background of corquera romblon (1).jpg',
        '../assets/generate background of corquera romblon (2).jpg',
        '../assets/7.jpg',
        '../assets/sea.jpg',
    ];
    
    let currentImageIndex = 0;
    
    function shuffleBanner() {
        const bannerImg = document.querySelector('.banner img');
        if (bannerImg) {
            bannerImg.src = bannerImages[currentImageIndex];
            currentImageIndex = (currentImageIndex + 1) % bannerImages.length;
        }
    }
    
    // Start shuffling
    setTimeout(() => {
        shuffleBanner();
        setInterval(shuffleBanner, 4000);
    }, 2000);
    
    // Update user interface
    function updateUserInterface(user) {
        const userNameElement = document.getElementById('userName')
        if (userNameElement) {
            userNameElement.textContent = user.fullName
        }
        updateProfileImage(user)
    }

    // Update profile image
    function updateProfileImage(user) {
        const img = document.getElementById('profileImg')
        const icon = document.getElementById('profileIcon')
        if (!img || !icon) return

        img.style.display = 'none'
        icon.style.display = 'block'

        if (user.photo && user.photo.trim()) {
            img.src = user.photo
            img.style.display = 'block'
            icon.style.display = 'none'
            img.onerror = () => {
                img.style.display = 'none'
                icon.style.display = 'block'
            }
        }
    }
    
    // Update greeting based on time
    function updateGreeting() {
        const greetingElement = document.getElementById('greetingText')
        if (!greetingElement) return
        
        const hour = new Date().getHours()
        let greeting = ''
        
        if (hour < 12) greeting = 'Good Morning,'
        else if (hour < 18) greeting = 'Good Afternoon,'
        else greeting = 'Good Evening,'
        
        greetingElement.textContent = greeting
    }
    
    // View profile
    window.viewProfile = function() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'))
        showNotification(`Name: ${currentUser.fullName}\nEmail: ${currentUser.email}`, 'info')
        closeModal()
    }
    
    // Change password
    window.changePassword = async function() {
        const currentPassword = prompt('Enter your current password:')
        if (!currentPassword) return
        
        const newPassword = prompt('Enter your new password (min 6 characters):')
        if (!newPassword || newPassword.length < 6) {
            showNotification('Password must be at least 6 characters', 'error')
            return
        }
        
        const confirmPassword = prompt('Confirm your new password:')
        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match', 'error')
            return
        }
        
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'))
            const { error: signInError } = await supabaseClient.auth.signInWithPassword({
                email: currentUser.email,
                password: currentPassword
            })
            
            if (signInError) {
                showNotification('Current password is incorrect', 'error')
                return
            }
            
            const { error } = await supabaseClient.auth.updateUser({
                password: newPassword
            })
            
            if (error) {
                showNotification(error.message, 'error')
            } else {
                showNotification('Password updated successfully!', 'success')
            }
        } catch (error) {
            showNotification('Error updating password', 'error')
        }
        
        closeModal()
    }
    
    // Logout
    window.logout = async function() {
        try {
            localStorage.removeItem('currentUser')
            await supabaseClient.auth.signOut()
            showNotification('Logged out successfully', 'success')
            setTimeout(() => {
                window.location.href = '../pages/login.html'
            }, 1000)
        } catch (error) {
            showNotification('Error logging out', 'error')
        }
    }
    
    function closeModal() {
        const modal = document.querySelector('.profile-modal')
        if (modal) modal.remove()
    }
    
    // Navigation
    window.navigateTo = function(page) {
        switch(page) {
            case 'home':
                window.location.href = '../pages/resident-homepage.html'
                break
            case 'map':
                window.location.href = '../pages/map.html'
                break
case 'notifications':
                window.location.href = '../pages/news.html'
                break
            case 'profile':
                window.location.href = '../pages/profile.html'
                break
            case 'settings':
                window.location.href = '../pages/setting.html'
                break
        }
    }
    
    // Services
    window.reportIssue = () => { window.location.href = '../pages/report.html'; }
    window.viewNews = () => { window.location.href = '../pages/news.html'; }
    window.viewTouristSpots = () => showNotification('Tourist spots feature coming soon!', 'info')
    window.viewMyReports = () => { window.location.href = '../pages/view-reports.html'; }
    
    // Notification function
    function showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.notification')
        if (existingNotification) existingNotification.remove()
        
        const notification = document.createElement('div')
        notification.className = `notification ${type}`
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 3000;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            font-family: 'Poppins', sans-serif;
            max-width: 90%;
            word-break: break-word;
            white-space: pre-line;
        `
        
        document.body.appendChild(notification)
        
        setTimeout(() => {
            if (notification && notification.parentNode) notification.remove()
        }, 4000)
    }
})