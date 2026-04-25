// Wait for Supabase SDK to load
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
    
    // Helper function to get email from full name
    async function getEmailFromFullName(fullName) {
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('email')
                .eq('full_name', fullName)
                .maybeSingle()
            
            if (error) {
                return null
            }
            
            return data ? data.email : null
        } catch (error) {
            return null
        }
    }
    
    // Helper function to check if input is email
    function isEmail(input) {
        const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/
        return emailRegex.test(input)
    }
    
    // Create profile function with retry logic
    async function createUserProfile(userId, email, fullName) {
        try {
            // First, check if profile already exists
            const { data: existingProfile, error: checkError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle()
            
            if (existingProfile) {
                return existingProfile;
            }
            
            // Create new profile with minimal required fields
            const profileData = {
                id: userId,
                full_name: fullName || email.split('@')[0] || 'User',
                email: email,
                user_type: 'resident',
                is_active: true
            };
            
            const { data: newProfile, error: insertError } = await supabaseClient
                .from('profiles')
                .insert([profileData])
                .select()
                .single()
            
            if (insertError) {
                // If unique violation, try to fetch again
                if (insertError.code === '23505') {
                    const { data: fetchedProfile, error: fetchError } = await supabaseClient
                        .from('profiles')
                        .select('*')
                        .eq('id', userId)
                        .maybeSingle()
                    
                    if (fetchedProfile) {
                        return fetchedProfile;
                    }
                }
                
                throw insertError;
            }
            
            return newProfile;
        } catch (error) {
            return null;
        }
    }
    
    // Login function
    async function handleLogin() {
        let inputValue = emailInput ? emailInput.value.trim() : ''
        const password = passwordInput ? passwordInput.value : ''
        
        if (!inputValue || !password) {
            showNotification('Please enter both email/full name and password', 'error')
            return
        }
        
        loginButton.disabled = true
        loginButton.textContent = 'Logging in...'
        
        try {
            let email = inputValue
            let isFullNameLogin = false
            
            if (!isEmail(inputValue)) {
                isFullNameLogin = true
                email = await getEmailFromFullName(inputValue)
                
                if (!email) {
                    showNotification('Name not found. Please check your full name or use email.', 'error')
                    loginButton.disabled = false
                    loginButton.textContent = 'Log In'
                    return
                }
            }
            
            const { data: authData, error: signInError } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            })
            
            if (signInError) {
                if (signInError.message.includes('Invalid login credentials')) {
                    showNotification(isFullNameLogin ? 'Invalid name or password' : 'Invalid email or password', 'error')
                } else if (signInError.message.includes('Email not confirmed')) {
                    showNotification('Please verify your email address', 'error')
                } else {
                    showNotification(`Login failed: ${signInError.message}`, 'error')
                }
                loginButton.disabled = false
                loginButton.textContent = 'Log In'
                return
            }
            
            if (!authData.user) {
                showNotification('Login failed: No user data', 'error')
                loginButton.disabled = false
                loginButton.textContent = 'Log In'
                return
            }
            
            // Get or create profile with retries
            let profile = null;
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts && !profile) {
                const { data: profileData, error: profileError } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', authData.user.id)
                    .maybeSingle()
                
                if (profileData) {
                    profile = profileData;
                    break;
                }
                
                if (!profileData) {
                    profile = await createUserProfile(
                        authData.user.id,
                        authData.user.email,
                        authData.user.user_metadata?.full_name
                    );
                    
                    if (profile) break;
                }
                
                attempts++;
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // Use fallback data if profile creation failed
            if (!profile) {
                profile = {
                    id: authData.user.id,
                    full_name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'User',
                    email: authData.user.email,
                    user_type: 'resident',
                    is_active: true
                };
            }
            
            if (profile.is_active === false) {
                showNotification('Your account has been deactivated.', 'error')
                await supabaseClient.auth.signOut()
                loginButton.disabled = false
                loginButton.textContent = 'Log In'
                return
            }
            
            // Store user data
            const userData = {
                id: profile.id,
                fullName: profile.full_name,
                email: profile.email,
                userType: profile.user_type,
                is_active: profile.is_active,
                isLoggedIn: true,
                loginTime: new Date().toISOString()
            }
            localStorage.setItem('currentUser', JSON.stringify(userData))
            
            showNotification(`Welcome back, ${profile.full_name}!`, 'success')
            
            setTimeout(() => {
                window.location.href = profile.user_type === 'admin' ? '../pages/admin-dashboard.html' : '../pages/resident-homepage.html'
            }, 1500)
            
        } catch (error) {
            showNotification('An unexpected error occurred. Please try again.', 'error')
            loginButton.disabled = false
            loginButton.textContent = 'Log In'
        }
    }
    
    // Forgot password handler
    if (forgotPassword) {
        forgotPassword.addEventListener('click', async () => {
            let inputValue = emailInput ? emailInput.value.trim() : ''
            
            if (!inputValue) {
                showNotification('Please enter your email or full name', 'error')
                return
            }
            
            let email = inputValue
            
            if (!isEmail(inputValue)) {
                showNotification('Looking up your account...', 'info')
                email = await getEmailFromFullName(inputValue)
                
                if (!email) {
                    showNotification('Name not found. Please enter your email.', 'error')
                    return
                }
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
    
    // Login button click
    if (loginButton) {
        loginButton.addEventListener('click', (e) => {
            e.preventDefault()
            handleLogin()
        })
    }
    
    // Enter key press
    if (emailInput && passwordInput) {
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault()
                handleLogin()
            }
        }
        emailInput.addEventListener('keypress', handleEnter)
        passwordInput.addEventListener('keypress', handleEnter)
    }
    
    // Check for new user from signup
    const newUserEmail = localStorage.getItem('newUserEmail')
    const newUserName = localStorage.getItem('newUserName')
    
    if (newUserEmail) {
        showNotification('Account ready! Please login with your credentials.', 'success')
        if (emailInput) emailInput.value = newUserEmail
        localStorage.removeItem('newUserEmail')
        localStorage.removeItem('newUserName')
    }
    
    // Check existing session
    const currentUser = localStorage.getItem('currentUser')
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser)
            if (user.isLoggedIn && user.loginTime) {
                const loginTime = new Date(user.loginTime)
                const now = new Date()
                const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60)
                
                if (hoursSinceLogin < 24) {
                    window.location.href = user.userType === 'admin' ? '../pages/admin-dashboard.html' : '../pages/resident-homepage.html'
                    return
                } else {
                    localStorage.removeItem('currentUser')
                }
            }
        } catch (e) {
            localStorage.removeItem('currentUser')
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