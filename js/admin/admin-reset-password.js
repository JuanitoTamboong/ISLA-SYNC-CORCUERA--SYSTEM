// Admin Reset Password Script
document.addEventListener('DOMContentLoaded', function() {
    if (typeof supabase === 'undefined') {
        showNotification('Connection issue: Please check your internet and try again.', 'error');
        return;
    }
    
    // Supabase configuration
    const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';
    
    // Initialize Supabase client
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Get form elements
    const form = document.getElementById('adminResetPasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const resetButton = document.getElementById('resetButton');
    const toggleNewPassword = document.getElementById('toggleNewPassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');
    const passwordMatchMessage = document.getElementById('passwordMatchMessage');
    
    // Toggle password visibility
    if (toggleNewPassword && newPasswordInput) {
        toggleNewPassword.addEventListener('click', function(e) {
            e.stopPropagation();
            const type = newPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            newPasswordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
    
    if (toggleConfirmPassword && confirmPasswordInput) {
        toggleConfirmPassword.addEventListener('click', function(e) {
            e.stopPropagation();
            const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }
    
    // Password requirements check
    function checkPasswordRequirements(password) {
        const reqLength = document.getElementById('reqLength');
        const reqLower = document.getElementById('reqLower');
        const reqUpper = document.getElementById('reqUpper');
        const reqNumber = document.getElementById('reqNumber');
        
        const hasLength = password.length >= 8;
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        
        if (reqLength) {
            reqLength.classList.toggle('valid', hasLength);
            const icon = reqLength.querySelector('i');
            if (icon) {
                icon.className = hasLength ? 'fas fa-check-circle' : 'fas fa-circle';
            }
        }
        if (reqLower) {
            reqLower.classList.toggle('valid', hasLower);
            const icon = reqLower.querySelector('i');
            if (icon) {
                icon.className = hasLower ? 'fas fa-check-circle' : 'fas fa-circle';
            }
        }
        if (reqUpper) {
            reqUpper.classList.toggle('valid', hasUpper);
            const icon = reqUpper.querySelector('i');
            if (icon) {
                icon.className = hasUpper ? 'fas fa-check-circle' : 'fas fa-circle';
            }
        }
        if (reqNumber) {
            reqNumber.classList.toggle('valid', hasNumber);
            const icon = reqNumber.querySelector('i');
            if (icon) {
                icon.className = hasNumber ? 'fas fa-check-circle' : 'fas fa-circle';
            }
        }
        
        return hasLength && hasLower && hasUpper && hasNumber;
    }
    
    // Check password match
    function checkPasswordMatch() {
        const newPassword = newPasswordInput ? newPasswordInput.value : '';
        const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
        
        if (!confirmPassword) {
            passwordMatchMessage.textContent = '';
            passwordMatchMessage.className = 'password-match-message';
            return;
        }
        
        if (newPassword === confirmPassword) {
            passwordMatchMessage.textContent = '✓ Passwords match!';
            passwordMatchMessage.className = 'password-match-message match';
        } else {
            passwordMatchMessage.textContent = '✗ Passwords do not match';
            passwordMatchMessage.className = 'password-match-message no-match';
        }
    }
    
    // Real-time validation
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function() {
            checkPasswordRequirements(this.value);
            checkPasswordMatch();
        });
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }
    
    // Handle form submit
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const newPassword = newPasswordInput ? newPasswordInput.value : '';
            const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
            
            // Validate password
            if (!checkPasswordRequirements(newPassword)) {
                showNotification('Please meet all password requirements', 'error');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showNotification('Passwords do not match', 'error');
                return;
            }
            
            // Disable button and show loading
            resetButton.disabled = true;
            resetButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            
            try {
                // Update password using Supabase
                const { data, error } = await supabaseClient.auth.updateUser({
                    password: newPassword
                });
                
                if (error) {
                    if (error.message.includes('Invalid refresh token')) {
                        showNotification('Session expired. Please request a new reset link.', 'error');
                        setTimeout(() => {
                            window.location.href = 'admin-login.html';
                        }, 2000);
                    } else {
                        showNotification('Failed to reset password: ' + error.message, 'error');
                    }
                    resetButton.disabled = false;
                    resetButton.innerHTML = '<i class="fas fa-sync-alt"></i> Reset Password';
                    return;
                }
                
                // Password reset successful - show success message and clear form
                showNotification('✓ Admin password reset successfully!', 'success');
                
                // Clear form fields
                if (newPasswordInput) newPasswordInput.value = '';
                if (confirmPasswordInput) confirmPasswordInput.value = '';
                passwordMatchMessage.textContent = '';
                passwordMatchMessage.className = 'password-match-message';
                
                // Reset password requirements
                const reqItems = document.querySelectorAll('.req-item');
                reqItems.forEach(item => {
                    item.classList.remove('valid');
                    const icon = item.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-circle';
                    }
                });
                
                // Reset button state
                resetButton.disabled = false;
                resetButton.innerHTML = '<i class="fas fa-sync-alt"></i> Reset Password';
                
                // Show additional success message
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.innerHTML = `
                    <i class="fas fa-check-circle" style="color: #10b981; font-size: 40px; display: block; margin: 0 auto 8px;"></i>
                    <p style="color: white; text-align: center; font-size: 15px; font-weight: 500;">Admin password has been updated successfully!</p>
                    <p style="color: #cbd5f5; text-align: center; font-size: 12px; margin-top: 4px;">You can now use your new password to login.</p>
                `;
                
                // Insert success message above the form
                const formContainer = form.parentNode;
                const existingSuccess = document.querySelector('.success-message');
                if (existingSuccess) existingSuccess.remove();
                formContainer.insertBefore(successMessage, form);
                
                // Remove success message after 5 seconds
                setTimeout(() => {
                    if (successMessage.parentNode) {
                        successMessage.remove();
                    }
                }, 5000);
                
            } catch (error) {
                showNotification('An unexpected error occurred. Please try again.', 'error');
                resetButton.disabled = false;
                resetButton.innerHTML = '<i class="fas fa-sync-alt"></i> Reset Password';
            }
        });
    }
    
    // Check if we have a session (user came from reset email)
    async function checkSession() {
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            
            if (error || !session) {
                // No session - user might have clicked a stale link
                showNotification('Invalid or expired reset link. Please request a new one.', 'error');
                setTimeout(() => {
                    window.location.href = 'admin-login.html';
                }, 3000);
                return;
            }
            
            // Session exists, user can reset password
            
        } catch (error) {
            // Allow user to try anyway
        }
    }
    
    // Check session on load
    checkSession();
    
    // Notification function
    function showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) existingNotification.remove();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
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
        });
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, 4000);
    }
});