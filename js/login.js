// Wait for Supabase SDK to load
document.addEventListener('DOMContentLoaded', function() {
    // Check if Supabase is loaded
    if (typeof supabase === 'undefined') {
        showNotification('Connection issue: Please check your internet and try again.', 'error');
        return;
    }
    
    // Supabase configuration
    const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co'
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds'
    
    // Initialize Supabase client
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    // Get form elements
    const loginForm = document.getElementById('loginForm')
    const emailInput = document.getElementById('emailInput')
    const passwordInput = document.getElementById('passwordInput')
    const loginButton = document.getElementById('loginButton')
    const forgotPassword = document.getElementById('forgotPassword')
    const togglePassword = document.getElementById('togglePassword')
    const googleBtn = document.querySelector('.social-btn[data-provider="google"]')

    // Reset Google button function
    function resetGoogleButton() {
        if (!googleBtn) return
        googleBtn.style.opacity = '1'
        googleBtn.style.pointerEvents = 'auto'
        googleBtn.innerHTML = '<img class="google-icon" src="../assets/google-icon.png" alt=""><span>Continue with Google</span>'
        googleBtn.setAttribute('aria-busy', 'false')
    }

    window.addEventListener('pageshow', function() {
        resetGoogleButton();
    });
    
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
            const { data: existingProfile, error: checkError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle()
            
            if (existingProfile) {
                return existingProfile;
            }
            
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
    
    // Process user after authentication (works for Google and Email)
    async function processUserAfterAuth(user, provider = 'social') {
        try {
            let profile = null;
            let attempts = 0;
            const maxAttempts = 3;
            
            // Get user's full name from various possible sources
            let fullName = user.user_metadata?.full_name || 
                          user.user_metadata?.name || 
                          user.user_metadata?.user_name ||
                          user.email?.split('@')[0] || 
                          'User';
            
            while (attempts < maxAttempts && !profile) {
                const { data: profileData, error: profileError } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle()
                
                if (profileData) {
                    profile = profileData;
                    break;
                }
                
                if (!profileData) {
                    profile = await createUserProfile(
                        user.id,
                        user.email,
                        fullName
                    );
                    
                    if (profile) break;
                }
                
                attempts++;
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            if (!profile) {
                profile = {
                    id: user.id,
                    full_name: fullName,
                    email: user.email,
                    user_type: 'resident',
                    is_active: true
                };
            }
            
            if (profile.is_active === false) {
                showNotification('Your account has been deactivated.', 'error');
                await supabaseClient.auth.signOut();
                return false;
            }
            
            if (profile.user_type === 'admin') {
                showNotification('Access denied: Please use the Admin Portal to login.', 'error');
                await supabaseClient.auth.signOut();
                return false;
            }
            
            const userData = {
                id: profile.id,
                fullName: profile.full_name,
                email: profile.email,
                userType: profile.user_type,
                is_active: profile.is_active,
                isLoggedIn: true,
                loginTime: new Date().toISOString(),
                authProvider: provider
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            showNotification(`Welcome ${profile.full_name}!`, 'success');
            
            // Clear URL parameters
            if (window.history && window.history.replaceState) {
                window.history.replaceState({}, document.title, window.location.pathname);
            }
            
            setTimeout(() => {
                window.location.href = '../pages/resident-homepage.html';
            }, 1500);
            
            return true;
            
        } catch (error) {
            showNotification('Error processing your account. Please try again.', 'error');
            return false;
        }
    }
    
    // Google Sign-In function
    async function handleGoogleSignIn() {
        try {
            if (googleBtn) {
                googleBtn.style.opacity = '0.5';
                googleBtn.style.pointerEvents = 'none';
                googleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                googleBtn.setAttribute('aria-busy', 'true');
            }
            
            showNotification('Redirecting to Google...', 'info');
            
            const { data, error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/pages/login.html'
                }
            });
            
            if (error) {
                showNotification('Google sign-in failed: ' + error.message, 'error');
                resetGoogleButton();
                return;
            }
            
            if (data && data.url) {
                window.location.href = data.url;
            }
            
        } catch (error) {
            showNotification('An unexpected error occurred. Please try again.', 'error');
            resetGoogleButton();
        }
    }
    
    // Handle OAuth callback with error handling
    async function handleOAuthCallback() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const error = urlParams.get('error');
            
            if (error) {
                showNotification('Authentication error: ' + error, 'error');
                resetGoogleButton();
                return;
            }
            
            if (code) {
                const { data, error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(code);
                
                if (exchangeError) {
                    console.error('Exchange error:', exchangeError);
                    
                    // Try to get session anyway
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if (session) {
                        const provider = session.user.app_metadata?.provider || 'social';
                        await processUserAfterAuth(session.user, provider);
                        resetGoogleButton();
                        return;
                    }
                    
                    showNotification('Failed to complete sign-in. Please try again.', 'error');
                    resetGoogleButton();
                    return;
                }
                
                if (data && data.session) {
                    const provider = data.session.user.app_metadata?.provider || 'social';
                    await processUserAfterAuth(data.session.user, provider);
                    resetGoogleButton();
                    return;
                }
            }
            
            // Check for existing session
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session) {
                const provider = session.user.app_metadata?.provider || 'social';
                await processUserAfterAuth(session.user, provider);
                resetGoogleButton();
                return;
            }
            
            resetGoogleButton();
            
        } catch (error) {
            console.error('Callback error:', error);
            showNotification('An error occurred during sign-in', 'error');
            resetGoogleButton();
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
            
            if (profile.user_type === 'admin') {
                showNotification('Access denied: Please use the Admin Portal to login.', 'error')
                await supabaseClient.auth.signOut()
                loginButton.disabled = false
                loginButton.textContent = 'Log In'
                return
            }
            
            const userData = {
                id: profile.id,
                fullName: profile.full_name,
                email: profile.email,
                userType: profile.user_type,
                is_active: profile.is_active,
                isLoggedIn: true,
                loginTime: new Date().toISOString(),
                authProvider: 'email'
            }
            localStorage.setItem('currentUser', JSON.stringify(userData))
            
            showNotification(`Welcome back, ${profile.full_name}!`, 'success')
            
            setTimeout(() => {
                window.location.href = '../pages/resident-homepage.html'
            }, 1500)
            
        } catch (error) {
            showNotification('An unexpected error occurred. Please try again.', 'error')
            loginButton.disabled = false
            loginButton.textContent = 'Log In'
        }
    }
    
    // Helper: Build a reliable redirect URL for Supabase
    function buildRedirectUrl() {
        const origin = window.location.origin;
        if (!origin || origin === 'null' || origin === 'file://') {
            const pathParts = window.location.pathname.split('/');
            pathParts.pop();
            const basePath = pathParts.join('/');
            return basePath + '/pages/reset-password.html';
        }
        return origin + '/pages/reset-password.html';
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
                const redirectUrl = buildRedirectUrl();
                
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: redirectUrl
                })
                
                if (error) {
                    if (error.message && (
                        error.message.includes('400') || 
                        error.message.includes('redirect') ||
                        error.message.includes('Configuration') ||
                        error.message.includes('url')
                    )) {
                        showNotification('Password reset link sent! If you don\'t receive it, ensure the redirect URL is whitelisted in Supabase Auth settings.', 'success');
                    } else if (error.message.includes('User not found')) {
                        showNotification('No account found', 'error')
                    } else {
                        showNotification(error.message, 'error')
                    }
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
            handleLogin()
        })
    }
    
    // Google Sign-In button handler
    if (googleBtn) {
        googleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleGoogleSignIn();
        });
        
        googleBtn.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleGoogleSignIn();
            }
        });
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
    
    // Check for OAuth callback (Google)
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    // ALWAYS check if we have a code parameter (not just in URL params, but ANYWHERE in the URL)
    const hasCode = window.location.search.includes('code=') || 
                    window.location.hash.includes('code=') ||
                    urlParams.get('code') ||
                    hashParams.get('code');
    
    const hasError = window.location.search.includes('error=') || 
                     window.location.hash.includes('error=') ||
                     urlParams.get('error') ||
                     hashParams.get('error');
    
    if (hasCode || hasError || 
        hashParams.get('access_token') || 
        hashParams.get('id_token')) {
        // We have an OAuth callback
        handleOAuthCallback();
    } else {
        // Also check for existing session on page load (for redirects)
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                const user = session.user;
                supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle()
                    .then(({ data: profile }) => {
                        if (profile && profile.user_type === 'resident' && profile.is_active !== false) {
                            const userData = {
                                id: profile.id,
                                fullName: profile.full_name,
                                email: profile.email,
                                userType: profile.user_type,
                                is_active: profile.is_active,
                                isLoggedIn: true,
                                loginTime: new Date().toISOString(),
                                authProvider: session.user.app_metadata?.provider || 'social'
                            };
                            localStorage.setItem('currentUser', JSON.stringify(userData));
                            // Clear URL before redirect
                            if (window.history && window.history.replaceState) {
                                window.history.replaceState({}, document.title, window.location.pathname);
                            }
                            window.location.href = '../pages/resident-homepage.html';
                        }
                    });
            }
        });
    }
    
    // Check existing session - ONLY for residents
    const currentUser = localStorage.getItem('currentUser')
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser)
            if (user.isLoggedIn && user.loginTime && user.userType === 'resident') {
                const loginTime = new Date(user.loginTime)
                const now = new Date()
                const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60)
                
                if (hoursSinceLogin < 24) {
                    window.location.href = '../pages/resident-homepage.html'
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
});