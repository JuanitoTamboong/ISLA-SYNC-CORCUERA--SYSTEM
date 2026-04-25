// Import Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// Supabase configuration
const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds'

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Signup script loaded successfully');
    
    // Get form elements
    const fullNameInput = document.querySelector('input[placeholder="Enter your full name"]')
    const emailInput = document.querySelector('input[placeholder="name@example.com"]')
    const passwordInput = document.querySelector('input[placeholder="Create a password"]')
    const confirmPasswordInput = document.querySelector('input[placeholder="Repeat password"]')
    const signupButton = document.querySelector('.btn')
    
    if (!signupButton) {
        console.error('Signup button not found!');
        return;
    }
    
    console.log('All elements found');
    
    // Toggle password visibility
    document.querySelectorAll('.toggle').forEach(toggle => {
        const passwordInput = toggle.previousElementSibling;
        if (passwordInput && passwordInput.tagName === 'INPUT') {
            toggle.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                toggle.classList.toggle('fa-eye');
                toggle.classList.toggle('fa-eye-slash');
            });
        }
    });
    
    // Signup button click handler
    signupButton.addEventListener('click', async (e) => {
        e.preventDefault()
        console.log('Signup button clicked');
        await handleSignup()
    })
    
    // Handle Enter key press
    const inputs = [fullNameInput, emailInput, passwordInput, confirmPasswordInput]
    inputs.forEach(input => {
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSignup()
                }
            })
        }
    })
    
    // Main signup function
    async function handleSignup() {
        console.log('handleSignup started');
        
        // Get values
        const fullName = fullNameInput ? fullNameInput.value.trim() : ''
        const email = emailInput ? emailInput.value.trim() : ''
        const password = passwordInput ? passwordInput.value : ''
        const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : ''
        
        // Validate inputs
        if (!fullName || !email || !password || !confirmPassword) {
            showNotification('Please fill in all fields', 'error')
            return
        }
        
        // Validate name (at least 2 words)
        if (fullName.split(' ').length < 2) {
            showNotification('Please enter your full name (first and last name)', 'error')
            return
        }
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            showNotification('Please enter a valid email address', 'error')
            return
        }
        
        // Validate password strength
        if (password.length < 6) {
            showNotification('Password must be at least 6 characters long', 'error')
            return
        }
        
        // Check if passwords match
        if (password !== confirmPassword) {
            showNotification('Passwords do not match', 'error')
            return
        }
        
        // Disable button to prevent multiple submissions
        signupButton.disabled = true
        signupButton.textContent = 'Creating Account...'
        
        try {
            console.log('Creating user in Supabase...');
            
            // Create user with Supabase Auth - FIXED WITH REDIRECT URL
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        user_type: 'resident'
                    },
                    emailRedirectTo: 'https://isla-sync-corcuera-system.vercel.app/pages/verify-email.html'  // KEY FIX!
                }
            })
            
            if (error) {
                console.error('Signup error:', error);
                if (error.message.includes('already registered')) {
                    showNotification('Email already registered. Please login instead.', 'error')
                } else {
                    showNotification(error.message, 'error')
                }
                signupButton.disabled = false
                signupButton.textContent = 'Sign Up'
                return
            }
            
            if (data.user) {
                console.log('User created successfully!');
                console.log('Verification email sent to:', email);
                
                // Show success message
                showNotification('Account created successfully! Please check your email to verify your account. Redirecting to login...', 'success')
                
                // Store user info in localStorage for welcome message
                localStorage.setItem('newUserEmail', email)
                localStorage.setItem('newUserName', fullName)
                
                // Redirect to login page after 2 seconds
                setTimeout(() => {
                    window.location.href = '../pages/login.html'
                }, 2000)
            }
            
        } catch (error) {
            console.error('Unexpected error:', error)
            showNotification('An error occurred. Please try again.', 'error')
            signupButton.disabled = false
            signupButton.textContent = 'Sign Up'
        }
    }
    
    // Notification function
    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification')
        if (existingNotification) {
            existingNotification.remove()
        }
        
        // Create notification element
        const notification = document.createElement('div')
        notification.className = `notification ${type}`
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `
        
        // Style the notification
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
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            font-family: 'Poppins', sans-serif;
            max-width: 90%;
            text-align: center;
        `
        
        document.body.appendChild(notification)
        
        // Remove notification after 4 seconds
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove()
            }
        }, 4000)
    }
})