// Wait for DOM and Supabase to load
document.addEventListener('DOMContentLoaded', function() {
    // Check if Supabase is loaded
    if (typeof supabase === 'undefined') {
        console.error('Supabase SDK not loaded');
        showNotification('Error: Supabase SDK failed to load. Please refresh the page.', 'error');
        return;
    }
    
    // Supabase configuration
    const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co'
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds'
    
    // Initialize Supabase client
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    console.log('Resident homepage loaded');
    
    // Check if user is logged in with id validation (fix 400 error)
    const currentUser = localStorage.getItem('currentUser')
    
    if (!currentUser) {
        console.log('No user found, redirecting to login');
        window.location.href = 'login.html'
        return
    }
    
    let user;
    try {
        user = JSON.parse(currentUser)
        if (!user || !user.id) {
            console.warn('No valid user id found, clearing localStorage')
            localStorage.removeItem('currentUser')
            window.location.href = 'login.html'
            return
        }
    } catch (e) {
        console.error('Invalid currentUser JSON:', e)
        localStorage.removeItem('currentUser')
        window.location.href = 'login.html'
        return
    }
    
    // Verify user is a resident
    if (user.userType !== 'resident') {
        console.log('User is not a resident, redirecting to admin page');
        window.location.href = 'admin-dashboard.html'
        return
    }
    
    // Verify session with Supabase
    async function verifySession() {
        try {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
            
            if (sessionError || !session) {
                console.log('Session expired or invalid');
                localStorage.removeItem('currentUser')
                window.location.href = 'login.html'
                return false
            }
            
            if (session.user.id !== user.id) {
                console.log('User ID mismatch');
                localStorage.removeItem('currentUser')
                window.location.href = 'login.html'
                return false
            }
            
            return true
        } catch (error) {
            console.error('Session verification error:', error);
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
                console.error('Error fetching profile:', profileError)
                updateUserInterface(user)
                return
            }
            
            if (profile) {
                user = {
                    ...user,
                    fullName: profile.full_name,
                    email: profile.email,
                    userType: profile.user_type,
                    is_active: profile.is_active
                }
                localStorage.setItem('currentUser', JSON.stringify(user))
                
                if (!profile.is_active) {
                    showNotification('Your account has been deactivated.', 'error')
                    setTimeout(() => logout(), 2000)
                    return
                }
                
                updateUserInterface(user)
                updateGreeting()
            }
        } catch (error) {
            console.error('Error loading user data:', error)
            updateUserInterface(user)
        }
    }
    
    // Run verification and load data
    verifySession().then(isValid => {
        if (isValid) {
            loadUserData()
        }
    })
    
    // Banner image shuffle for Explore Simara Island
    const bannerImages = [
        'assets/generate background image of corquera romblon.jpg',
        'assets/generate background image of corquera romblon (1).jpg',
        'assets/generate background image of corquera romblon (2).jpg',
        'assets/generate background image of corquera romblon sea-7.jpg',
        'assets/generate background of corquera romblon.jpg',
        'assets/generate background of corquera romblon (1).jpg',
        'assets/generate background of corquera romblon (2).jpg',
        'assets/7.jpg',
        'assets/sea.jpg',

    ];
    
    let currentImageIndex = 0;
    
    function shuffleBanner() {
        const bannerImg = document.querySelector('.banner img');
        if (bannerImg) {
            bannerImg.src = bannerImages[currentImageIndex];
            currentImageIndex = (currentImageIndex + 1) % bannerImages.length;
        }
    }
    
    // Start shuffling after 2s delay, every 4s
    setTimeout(() => {
        shuffleBanner(); // Initial set
        setInterval(shuffleBanner, 4000);
    }, 2000);
    
    // Update user interface
    function updateUserInterface(user) {
        const userNameElement = document.getElementById('userName')
        if (userNameElement) {
            userNameElement.textContent = user.fullName
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
                window.location.href = 'login.html'
            }, 1000)
        } catch (error) {
            console.error('Logout error:', error)
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
                window.location.href = 'setting.html'
                break
        }
    }
    
    // Services
window.reportIssue = () => { window.location.href = 'report.html'; }
    window.viewNews = () => showNotification('Latest news feature coming soon!', 'info')
    window.viewTouristSpots = () => showNotification('Tourist spots feature coming soon!', 'info')
    
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
