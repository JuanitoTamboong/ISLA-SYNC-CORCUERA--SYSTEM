// Admin Profile Script - Fetches real admin data from Supabase and supports editing
document.addEventListener('DOMContentLoaded', async function() {
    // Check if Supabase is loaded
    if (typeof supabase === 'undefined') {
        showNotification('Error: Supabase SDK failed to load. Please refresh the page.', 'error');
        return;
    }

    // Supabase configuration
    const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';

    // Initialize Supabase client
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

    // Load fresh admin data from Supabase and update UI
    await loadAdminData(supabaseClient, admin.id);

    // Setup edit profile functionality
    setupEditProfile(supabaseClient);
    setupPhotoUpload();

    // Back button navigation
    const backBtn = document.querySelector('.header i.fa-arrow-left');
    if (backBtn) {
        backBtn.style.cursor = 'pointer';
        backBtn.addEventListener('click', () => {
            window.location.href = 'admin-settings.html';
        });
    }
});

async function loadAdminData(supabaseClient, adminId) {
    try {
        // Fetch fresh admin profile from Supabase
        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', adminId)
            .single();

        if (error) {
            console.error('Error fetching admin profile:', error);
            showNotification('Failed to load admin profile', 'error');
            useLocalStorageData();
            return;
        }

        if (!profile) {
            showNotification('Admin profile not found', 'error');
            window.location.href = 'admin-login.html';
            return;
        }

        // Update localStorage with fresh data
        const adminData = {
            id: profile.id,
            fullName: profile.full_name || '',
            email: profile.email || '',
            userType: 'admin',
            is_active: profile.is_active,
            isLoggedIn: true,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('currentAdmin', JSON.stringify(adminData));

        // Store current profile data for editing
        currentProfileData = profile;

        // Update DOM with real data
        updateAdminProfileUI(profile);

    } catch (error) {
        console.error('Unexpected error:', error);
        showNotification('An error occurred while loading profile', 'error');
        useLocalStorageData();
    }
}

function useLocalStorageData() {
    const currentAdminStr = localStorage.getItem('currentAdmin');
    if (!currentAdminStr) return;

    try {
        const admin = JSON.parse(currentAdminStr);
        const profile = {
            full_name: admin.fullName || 'Admin',
            email: admin.email || '',
            id: admin.id || ''
        };
        updateAdminProfileUI(profile);
    } catch (e) {
        // Silently fail
    }
}

function updateAdminProfileUI(profile) {
    // Update display name
    const displayNameEl = document.getElementById('adminDisplayName');
    if (displayNameEl) {
        displayNameEl.textContent = profile.full_name || 'Admin';
    }

    // Update full name in personal info
    const fullNameEl = document.getElementById('adminFullName');
    if (fullNameEl) {
        fullNameEl.textContent = profile.full_name || 'Admin';
    }

    // Update email
    const emailEl = document.getElementById('adminEmail');
    if (emailEl) {
        emailEl.textContent = profile.email || 'No email provided';
    }

    // Update avatar if available
    const avatarEl = document.getElementById('adminAvatar');
    if (avatarEl && profile.avatar_url) {
        avatarEl.src = profile.avatar_url;
        avatarEl.onerror = function() {
            this.src = '../../assets/isla-logo.png';
        };
    }

    // Update account ID (shortened UUID)
    const accountIdEl = document.getElementById('adminAccountId');
    if (accountIdEl && profile.id) {
        const shortId = profile.id.substring(0, 8).toUpperCase();
        accountIdEl.textContent = 'ISC-' + shortId;
    }
}

let tempPhotoData = null;
let currentProfileData = null;

function setupEditProfile(supabaseClient) {
    const editBtn = document.getElementById('editProfileBtn');
    const form = document.getElementById('editProfileForm');
    const cancelBtn = document.getElementById('cancelEdit');
    const saveBtn = document.getElementById('saveProfile');
    const profileSection = document.querySelector('.profile');

    let isSaving = false;

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            tempPhotoData = null;
            form.classList.add('active');
            if (profileSection) {
                profileSection.style.display = 'none';
            }
            // Hide personal info and admin controls sections
            const sectionTitles = document.querySelectorAll('.section-title');
            const cards = document.querySelectorAll('.card');
            sectionTitles.forEach(el => el.style.display = 'none');
            cards.forEach(el => el.style.display = 'none');

            populateEditForm();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelEdit);
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => saveProfile(supabaseClient));
    }

    function cancelEdit() {
        form.classList.remove('active');
        if (profileSection) {
            profileSection.style.display = 'block';
        }
        const sectionTitles = document.querySelectorAll('.section-title');
        const cards = document.querySelectorAll('.card');
        sectionTitles.forEach(el => el.style.display = 'block');
        cards.forEach(el => el.style.display = 'block');
        tempPhotoData = null;
        isSaving = false;
    }

    async function saveProfile(supabaseClient) {
        const formData = {
            fullName: document.getElementById('formFullName').value.trim(),
            email: document.getElementById('formEmail').value.trim(),
            photo: tempPhotoData
        };

        if (!formData.photo) {
            const currentUser = JSON.parse(localStorage.getItem('currentAdmin') || '{}');
            formData.photo = currentProfileData && currentProfileData.avatar_url ? currentProfileData.avatar_url : '';
        }

        if (isSaving) return;
        isSaving = true;
        saveBtn.disabled = true;
        const originalHTML = saveBtn.innerHTML;
        saveBtn.innerHTML = 'Saving... <i class="fa-solid fa-spinner fa-spin"></i>';

        const success = await saveProfileToSupabase(formData, supabaseClient);

        if (success) {
            showNotification('Profile updated successfully!', 'success');
            cancelEdit();
            // Reload data to reflect changes
            const currentAdmin = JSON.parse(localStorage.getItem('currentAdmin') || '{}');
            if (currentAdmin.id) {
                await loadAdminData(supabaseClient, currentAdmin.id);
            }
        } else {
            showNotification('Failed to update profile. Please try again.', 'error');
        }

        isSaving = false;
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalHTML;
    }
}

function populateEditForm() {
    const formFullName = document.getElementById('formFullName');
    const formEmail = document.getElementById('formEmail');
    const photoPreview = document.getElementById('photoPreview');
    const photoPlaceholder = document.getElementById('photoPlaceholder');

    // Get latest data from localStorage or currentProfileData
    let user = {};
    if (currentProfileData) {
        user = {
            fullName: currentProfileData.full_name || '',
            email: currentProfileData.email || '',
            photo: currentProfileData.avatar_url || ''
        };
    } else {
        const currentAdminStr = localStorage.getItem('currentAdmin');
        if (currentAdminStr) {
            const admin = JSON.parse(currentAdminStr);
            user = {
                fullName: admin.fullName || '',
                email: admin.email || '',
                photo: ''
            };
        }
    }

    if (formFullName) formFullName.value = user.fullName || '';
    if (formEmail) formEmail.value = user.email || '';

    if (photoPreview && photoPlaceholder) {
        if (user.photo && user.photo.trim() !== '') {
            photoPreview.src = user.photo;
            photoPreview.style.display = 'block';
            photoPlaceholder.style.display = 'none';
        } else {
            photoPreview.style.display = 'none';
            photoPlaceholder.style.display = 'flex';
        }
    }
}

async function saveProfileToSupabase(formData, supabaseClient) {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            return false;
        }

        const profileData = {
            id: session.user.id,
            full_name: formData.fullName,
            email: formData.email,
            avatar_url: formData.photo || null,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabaseClient
            .from('profiles')
            .upsert(profileData, {
                onConflict: 'id'
            });

        if (error) {
            showNotification(`Error: ${error.message}`, 'error');
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

function setupPhotoUpload() {
    const photoInput = document.getElementById('photoInput');
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const photoPreview = document.getElementById('photoPreview');
    const photoPlaceholder = document.getElementById('photoPlaceholder');

    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoUpload);
    }

    if (changePhotoBtn) {
        changePhotoBtn.addEventListener('click', () => photoInput.click());
    }

    if (photoPlaceholder) {
        photoPlaceholder.addEventListener('click', () => photoInput.click());
    }

    function handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showNotification('Please select an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image too large (max 5MB)', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const photoData = e.target.result;
            tempPhotoData = photoData;

            if (photoPreview && photoPlaceholder) {
                photoPreview.src = photoData;
                photoPreview.style.display = 'block';
                photoPlaceholder.style.display = 'none';
            }

            showNotification('Photo selected! Click Save to update your profile photo.', 'success');
        };
        reader.onerror = function() {
            showNotification('Failed to read image', 'error');
        };
        reader.readAsDataURL(file);
    }
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
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
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}

