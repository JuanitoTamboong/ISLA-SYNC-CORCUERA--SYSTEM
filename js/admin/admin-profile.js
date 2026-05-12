// Admin Profile Script - Fetches real admin data from Supabase and supports editing
document.addEventListener('DOMContentLoaded', async function() {
    // Check if Supabase is loaded
    if (typeof supabase === 'undefined') {
        showNotification('Error: Configuration failed to load. Please refresh the page.', 'error');
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

    // Immediately display local data
    displayLocalDataImmediately(admin);

    // Setup functionality
    setupEditProfile(supabaseClient);
    setupPhotoUpload();

    // Background sync from Supabase
    syncFromSupabase(supabaseClient, admin.id);

    // Back button navigation
    const backBtn = document.querySelector('.header i.fa-arrow-left');
    if (backBtn) {
        backBtn.style.cursor = 'pointer';
        backBtn.addEventListener('click', () => {
            window.location.href = 'admin-settings.html';
        });
    }
});

async function syncFromSupabase(supabaseClient, adminId) {
    try {
        // Fetch profile
        let { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', adminId)
            .single();

        if (error && error.code !== 'PGRST116') {
            await new Promise(r => setTimeout(r, 1000));
            const { data: retryProfile, error: retryError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', adminId)
                .single();
            if (retryError) throw retryError;
            profile = retryProfile;
        }

        let needsUpsert = false;
        if (!profile) {
            needsUpsert = true;
            profile = {
                id: adminId,
                full_name: 'System Administrator',
                email: 'islasyncorqueraadmin@gmail.com',
                avatar_url: ''
            };
        }

        // Update/upsert profile
        if (needsUpsert) {
            const currentAdmin = JSON.parse(localStorage.getItem('currentAdmin'));
            profile.full_name = currentAdmin.fullName || profile.full_name;
            profile.email = currentAdmin.email || profile.email;
            
            await supabaseClient
                .from('profiles')
                .upsert(profile);
        }

        // Update localStorage and UI
        const adminData = {
            id: profile.id,
            fullName: profile.full_name || '',
            email: profile.email || '',
            userType: 'admin',
            is_active: profile.is_active || true,
            isLoggedIn: true,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem('currentAdmin', JSON.stringify(adminData));
        currentProfileData = profile;
        updateAdminProfileUI(profile);

    } catch (error) {
        // Silent fail - local data already shown
    }
}

function displayLocalDataImmediately(admin) {
    const profile = {
        full_name: admin.fullName || 'Admin',
        email: admin.email || 'admin@islasync.gov',
        id: admin.id || '',
        avatar_url: ''
    };
    currentProfileData = profile;
    updateAdminProfileUI(profile);
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
    const avatarContainer = avatarEl ? avatarEl.closest('.avatar') : null;
    if (avatarEl && avatarContainer) {
        if (profile.avatar_url && profile.avatar_url.trim() !== '') {
            avatarEl.src = profile.avatar_url;
            avatarEl.onload = function() {
                avatarContainer.classList.add('has-image');
            };
            avatarEl.onerror = function() {
                avatarContainer.classList.remove('has-image');
                avatarEl.src = '';
            };
        } else {
            avatarContainer.classList.remove('has-image');
        }
    }

    // Update account ID
    const accountIdEl = document.getElementById('adminAccountId');
    if (accountIdEl && profile.id) {
        const shortId = profile.id.substring(0, 8).toUpperCase();
        accountIdEl.textContent = 'ISC-' + shortId;
    } else if (accountIdEl) {
        accountIdEl.textContent = 'ISC-00000000';
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
            const currentAdmin = JSON.parse(localStorage.getItem('currentAdmin') || '{}');
            if (currentAdmin.id) {
                syncFromSupabase(supabaseClient, currentAdmin.id);
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
        const currentAdminStr = localStorage.getItem('currentAdmin');
        const currentAdmin = JSON.parse(currentAdminStr);
        
        if (!currentAdmin || !currentAdmin.id) {
            showNotification('Session not found. Please login again.', 'error');
            return false;
        }

        const profileData = {
            id: currentAdmin.id,
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

        const updatedAdmin = {
            ...currentAdmin,
            fullName: formData.fullName,
            email: formData.email
        };
        localStorage.setItem('currentAdmin', JSON.stringify(updatedAdmin));

        return true;
    } catch (error) {
        showNotification('Failed to save profile. Please try again.', 'error');
        return false;
    }
}

function setupPhotoUpload() {
    const photoInput = document.getElementById('photoInput');
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const photoPreview = document.getElementById('photoPreview');
    const photoPlaceholder = document.getElementById('photoPlaceholder');

    if (photoInput) {
        const newPhotoInput = photoInput.cloneNode(true);
        photoInput.parentNode.replaceChild(newPhotoInput, photoInput);
        newPhotoInput.addEventListener('change', handlePhotoUpload);
    }

    if (changePhotoBtn) {
        const newChangeBtn = changePhotoBtn.cloneNode(true);
        changePhotoBtn.parentNode.replaceChild(newChangeBtn, changePhotoBtn);
        newChangeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const input = document.getElementById('photoInput');
            if (input) input.click();
        });
    }

    if (photoPlaceholder) {
        const newPlaceholder = photoPlaceholder.cloneNode(true);
        photoPlaceholder.parentNode.replaceChild(newPlaceholder, photoPlaceholder);
        newPlaceholder.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const input = document.getElementById('photoInput');
            if (input) input.click();
        });
        window.photoPlaceholder = newPlaceholder;
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

        const MAX_UPLOAD_BYTES = 70 * 1024;

        const estimateBytesFromDataUrl = (dataUrl) => {
            const base64 = dataUrl.split(',')[1] || '';
            const padding = (base64.endsWith('==') ? 2 : (base64.endsWith('=') ? 1 : 0));
            return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
        };

        const compressToTarget = (imgEl) => {
            const dimensionSteps = [1024, 768, 512, 384, 256];
            const qualitySteps = [0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.12, 0.1];

            for (const maxDim of dimensionSteps) {
                let w = imgEl.width;
                let h = imgEl.height;

                if (w > h) {
                    if (w > maxDim) {
                        h = (h * maxDim) / w;
                        w = maxDim;
                    }
                } else {
                    if (h > maxDim) {
                        w = (w * maxDim) / h;
                        h = maxDim;
                    }
                }

                w = Math.round(w);
                h = Math.round(h);

                const tryCanvas = document.createElement('canvas');
                const tryCtx = tryCanvas.getContext('2d');
                tryCanvas.width = w;
                tryCanvas.height = h;
                tryCtx.drawImage(imgEl, 0, 0, w, h);

                for (const q of qualitySteps) {
                    const dataUrl = tryCanvas.toDataURL('image/jpeg', q);
                    const bytes = estimateBytesFromDataUrl(dataUrl);
                    if (bytes <= MAX_UPLOAD_BYTES) return dataUrl;
                }
            }

            const finalMaxDim = 256;
            let w = imgEl.width;
            let h = imgEl.height;
            if (w > h) {
                if (w > finalMaxDim) {
                    h = (h * finalMaxDim) / w;
                    w = finalMaxDim;
                }
            } else {
                if (h > finalMaxDim) {
                    w = (w * finalMaxDim) / h;
                    h = finalMaxDim;
                }
            }

            w = Math.round(w);
            h = Math.round(h);

            const finalCanvas = document.createElement('canvas');
            const finalCtx = finalCanvas.getContext('2d');
            finalCanvas.width = w;
            finalCanvas.height = h;
            finalCtx.drawImage(imgEl, 0, 0, w, h);
            return finalCanvas.toDataURL('image/jpeg', 0.1);
        };

        const reader = new FileReader();
        reader.onload = function(e) {
            const originalDataUrl = e.target.result;
            const img = new Image();
            img.onload = () => {
                const compressedDataUrl = compressToTarget(img);
                const estimatedBytes = estimateBytesFromDataUrl(compressedDataUrl);

                tempPhotoData = compressedDataUrl;

                if (photoPreview && photoPlaceholder) {
                    photoPreview.src = compressedDataUrl;
                    photoPreview.style.display = 'block';
                    photoPlaceholder.style.display = 'none';
                }

                if (estimatedBytes > MAX_UPLOAD_BYTES) {
                    showNotification('Photo may be larger than 70KB. Try a smaller image for best results.', 'error');
                } else {
                    showNotification('Photo selected! Click Save to update.', 'success');
                }
            };
            img.onerror = () => {
                tempPhotoData = originalDataUrl;
                if (photoPreview && photoPlaceholder) {
                    photoPreview.src = originalDataUrl;
                    photoPreview.style.display = 'block';
                    photoPlaceholder.style.display = 'none';
                }
                showNotification('Photo selected! Click Save to update.', 'success');
            };
            img.src = originalDataUrl;
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