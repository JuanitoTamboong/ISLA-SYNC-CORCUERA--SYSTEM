// Admin Login Script - Completely separate from resident login
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
    
    // Get form elements
    const loginForm = document.getElementById('adminLoginForm')
    const emailInput = document.getElementById('emailInput')
    const passwordInput = document.getElementById('passwordInput')
    const loginButton = document.getElementById('loginButton')
    const forgotPassword = document.getElementById('forgotPassword')
    const togglePassword = document.getElementById('togglePassword')
    
    // Toggle password visibility
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
            passwordInput.setAttribute('type', type)
            togglePassword.classList.toggle('fa-eye')
            togglePassword.classList.toggle('fa-eye-slash')
        })
    }
    
    // Helper function to check if input is email
    function isEmail(input) {
        const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/
        return emailRegex.test(input)
    }
    
    // Admin login function
    async function handleAdminLogin() {
        const email = emailInput ? emailInput.value.trim() : ''
        const password = passwordInput ? passwordInput.value : ''
        
        if (!email || !password) {
            showNotification('Please enter both email and password', 'error')
            return
        }
        
        if (!isEmail(email)) {
            showNotification('Please enter a valid email address', 'error')
            return
        }
        
        loginButton.disabled = true
        loginButton.textContent = 'Logging in...'
        
        try {
            const { data: authData, error: signInError } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            })
            
            if (signInError) {
                if (signInError.message.includes('Invalid login credentials')) {
                    showNotification('Invalid email or password', 'error')
                } else if (signInError.message.includes('Email not confirmed')) {
                    showNotification('Please verify your email address', 'error')
                } else {
                    showNotification(`Login failed: ${signInError.message}`, 'error')
                }
                loginButton.disabled = false
                loginButton.textContent = 'Admin Log In'
                return
            }
            
            if (!authData.user) {
                showNotification('Login failed: No user data', 'error')
                loginButton.disabled = false
                loginButton.textContent = 'Admin Log In'
                return
            }
            
            // Fetch admin profile
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', authData.user.id)
                .maybeSingle()
            
            if (profileError || !profile) {
                showNotification('Admin profile not found', 'error')
                await supabaseClient.auth.signOut()
                loginButton.disabled = false
                loginButton.textContent = 'Admin Log In'
                return
            }
            
            // Verify this is an admin account
            if (profile.user_type !== 'admin') {
                showNotification('Access denied: This account is not an admin', 'error')
                await supabaseClient.auth.signOut()
                loginButton.disabled = false
                loginButton.textContent = 'Admin Log In'
                return
            }
            
            if (profile.is_active === false) {
                showNotification('Your admin account has been deactivated.', 'error')
                await supabaseClient.auth.signOut()
                loginButton.disabled = false
                loginButton.textContent = 'Admin Log In'
                return
            }
            
            // Store admin data separately from resident data
            const adminData = {
                id: profile.id,
                fullName: profile.full_name,
                email: profile.email,
                userType: 'admin',
                is_active: profile.is_active,
                isLoggedIn: true,
                loginTime: new Date().toISOString()
            }
            localStorage.setItem('currentAdmin', JSON.stringify(adminData))
            // Clear any resident session
            localStorage.removeItem('currentUser')
            
            showNotification(`Welcome back, Admin ${profile.full_name}!`, 'success')
            
            setTimeout(() => {
                window.location.href = 'admin-homepage.html'
            }, 1500)
            
        } catch (error) {
            showNotification('An unexpected error occurred. Please try again.', 'error')
            loginButton.disabled = false
            loginButton.textContent = 'Admin Log In'
        }
    }
    
    // Forgot password handler
    if (forgotPassword) {
        forgotPassword.addEventListener('click', async () => {
            const email = emailInput ? emailInput.value.trim() : ''
            
            if (!email) {
                showNotification('Please enter your email', 'error')
                return
            }
            
            if (!isEmail(email)) {
                showNotification('Please enter a valid email address', 'error')
                return
            }
            
            try {
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/pages/reset-password.html`
                })
                
                if (error) {
                    showNotification(error.message.includes('User not found') ? 'No account found' : error.message, 'error')
                } else {
                    showNotification('Password reset email sent! Check your inbox.', 'success')
                }
            } catch (error) {
                showNotification('Error sending reset email. Please try again.', 'error')
            }
        })
    }
    
    // Form submit handler
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault()
            handleAdminLogin()
        })
    }
    
    // Check existing admin session
    const currentAdmin = localStorage.getItem('currentAdmin')
    if (currentAdmin) {
        try {
            const admin = JSON.parse(currentAdmin)
            if (admin.isLoggedIn && admin.loginTime) {
                const loginTime = new Date(admin.loginTime)
                const now = new Date()
                const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60)
                
                if (hoursSinceLogin < 24) {
                    window.location.href = 'admin-homepage.html'
                    return
                } else {
                    localStorage.removeItem('currentAdmin')
                }
            }
        } catch (e) {
            localStorage.removeItem('currentAdmin')
        }
    }
    
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
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            zIndex: '1000',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            fontFamily: "'Poppins', sans-serif",
            maxWidth: '90%',
            textAlign: 'center',
            wordBreak: 'break-word'
        })
        
        document.body.appendChild(notification)
        
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove()
            }
        }, 4000)
    }
})
