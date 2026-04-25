document.addEventListener('DOMContentLoaded', async function() {
    // Check if Supabase is loaded
    if (typeof supabase === 'undefined') {
        alert('Error: Supabase SDK failed to load. Please refresh the page.');
        return;
    }

    // Supabase configuration
    const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';

    // Initialize Supabase client
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Check session
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = '../pages/login.html';
        return;
    }

    // Load user data
    await loadUserDataFromSupabase(supabaseClient);
    loadAndUpdateProfile();
    await fetchReportCounts(supabaseClient);

    // Show notification function
    window.showNotification = function(message, type = 'info') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '12px 24px';
        notification.style.borderRadius = '12px';
        notification.style.color = 'white';
        notification.style.fontSize = '14px';
        notification.style.fontWeight = '500';
        notification.style.zIndex = '10000';               
        notification.style.maxWidth = '90vw';
        notification.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
        notification.style.backgroundColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-20px)';
        notification.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(-50%) translateY(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    };
    
    // Back button navigation
    const backBtn = document.querySelector('.header i');
    if (backBtn) {
        backBtn.style.cursor = 'pointer';
        backBtn.addEventListener('click', () => {
            window.location.href = '../pages/resident-homepage.html';
        });
    }

    // Setup edit profile functionality
    setupEditProfile(supabaseClient);
    setupPhotoUpload();
});

async function loadUserDataFromSupabase(supabaseClient) {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) return;

        const { data: profile, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            return;
        }

        if (profile) {
            const userData = {
                id: profile.id,
                fullName: profile.full_name || '',
                email: profile.email || '',
                phone: profile.phone_number || '',
                address: profile.address || '',
                dateOfBirth: profile.date_of_birth || '',
                photo: profile.avatar_url || '',
                userType: profile.user_type || 'resident'
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
        }
    } catch (error) {
        // Silently handle error
    }
}

async function fetchReportCounts(supabaseClient) {
    try {
        const currentUserStr = localStorage.getItem('currentUser');
        if (!currentUserStr) return;
        const user = JSON.parse(currentUserStr);
        
        const { data, error } = await supabaseClient
            .from('reports')
            .select('status')
            .eq('user_id', user.id);
        
        if (error) {
            return;
        }
        
        const total = data.length;
        const resolved = data.filter(r => r.status === 'resolved').length;
        const pending = data.filter(r => r.status === 'pending' || r.status === 'in_review').length;
        
        document.getElementById('totalReports').textContent = total;
        document.getElementById('resolvedReports').textContent = resolved;
        document.getElementById('pendingReports').textContent = pending;
    } catch (error) {
        // Silently handle error
    }
}

function loadAndUpdateProfile() {
    const currentUser = localStorage.getItem('currentUser');
    let user = currentUser ? JSON.parse(currentUser) : {};
    let completionPercentage = calculateCompletion(user);

    updateProfileDisplay(user);
    updateProfileCompletion(completionPercentage);
    populateEditForm(user);
}

function calculateCompletion(user) {
    const fields = ['fullName', 'email', 'photo', 'phone', 'address', 'dateOfBirth'];
    let completed = 0;
    
    fields.forEach(field => {
        if (user[field] && user[field].toString().trim() !== '') {
            completed++;
        }
    });
    
    return Math.round((completed / fields.length) * 100);
}

function updateProfileDisplay(user) {
    // Basic info
    const profileName = document.getElementById('profileName');
    const personalFullName = document.getElementById('personalFullName');
    const profileEmail = document.getElementById('profileEmail');
    const personalEmail = document.getElementById('personalEmail');
    
    if (profileName) profileName.textContent = user.fullName || 'Your Name';
    if (personalFullName) personalFullName.textContent = user.fullName || 'Your Name';
    if (profileEmail) profileEmail.textContent = user.email || 'your@email.com';
    if (personalEmail) personalEmail.textContent = user.email || 'your@email.com';
    
    // Update phone
    const personalPhone = document.getElementById('personalPhone');
    if (personalPhone) {
        personalPhone.textContent = user.phone && user.phone.trim() !== '' ? user.phone : 'Add phone number';
        const phoneIcon = document.getElementById('phoneIcon');
        if (phoneIcon && user.phone && user.phone.trim() !== '') {
            phoneIcon.classList.add('complete');
        } else if (phoneIcon) {
            phoneIcon.classList.remove('complete');
        }
    }
    
    // Update address
    const personalAddress = document.getElementById('personalAddress');
    if (personalAddress) {
        personalAddress.textContent = user.address && user.address.trim() !== '' ? user.address : 'Add your address';
        const addressIcon = document.getElementById('addressIcon');
        if (addressIcon && user.address && user.address.trim() !== '') {
            addressIcon.classList.add('complete');
        } else if (addressIcon) {
            addressIcon.classList.remove('complete');
        }
    }
    
    // Update date of birth
    const personalDOB = document.getElementById('personalDOB');
    if (personalDOB) {
        if (user.dateOfBirth && user.dateOfBirth.trim() !== '') {
            const formattedDate = new Date(user.dateOfBirth).toLocaleDateString();
            personalDOB.textContent = formattedDate;
            const dobIcon = document.getElementById('dobIcon');
            if (dobIcon) {
                dobIcon.classList.add('complete');
            }
        } else {
            personalDOB.textContent = 'Add your date of birth';
            const dobIcon = document.getElementById('dobIcon');
            if (dobIcon) {
                dobIcon.classList.remove('complete');
            }
        }
    }
    
    // Update photo
    updatePhotoDisplay(user.photo);
}

function updatePhotoDisplay(photoData) {
    const avatar = document.getElementById('userAvatar');
    if (!avatar) return;
    
    avatar.innerHTML = '';
    
    if (photoData && photoData.trim() !== '') {
        avatar.classList.add('has-photo');
        const img = document.createElement('img');
        img.src = photoData;
        img.alt = 'Profile Photo';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.borderRadius = '50%';
        img.style.objectFit = 'cover';
        img.onerror = function() {
            avatar.classList.remove('has-photo');
        };
        avatar.appendChild(img);
    } else {
        avatar.classList.remove('has-photo');
    }
    
    const editSpan = document.createElement('span');
    editSpan.className = 'edit';
    editSpan.title = 'Change Photo';
    editSpan.innerHTML = '<i class="fas fa-camera"></i>';
    avatar.appendChild(editSpan);
}

function updateProfileCompletion(percentage) {
    const progressFill = document.getElementById('progressFill');
    const completionText = document.getElementById('completionText');
    
    percentage = Math.min(100, Math.max(0, percentage));
    if (progressFill) {
        progressFill.style.width = percentage + '%';
    }
    
    if (completionText) {
        if (percentage === 100) {
            completionText.textContent = '100% Completed!';
            completionText.classList.add('perfect');
        } else {
            completionText.textContent = percentage + '% Complete';
            completionText.classList.remove('perfect');
        }
    }
}

let tempPhotoData = null;

function setupEditProfile(supabaseClient) {
    const editBtn = document.getElementById('editProfileBtn');
    const form = document.getElementById('editProfileForm');
    const cancelBtn = document.getElementById('cancelEdit');
    const saveBtn = document.getElementById('saveProfile');

    let isSaving = false;

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            tempPhotoData = null;
            form.classList.add('active');
            document.querySelector('.profile').style.display = 'none';
            const sections = document.querySelectorAll('.section');
            sections.forEach(section => {
                section.style.display = 'none';
            });
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
        document.querySelector('.profile').style.display = 'block';
        const sections = document.querySelectorAll('.section');
        sections.forEach(section => {
            section.style.display = 'block';
        });
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        populateEditForm(currentUser);
        tempPhotoData = null;
        isSaving = false; // Reset saving state
    }

    async function saveProfile(supabaseClient) {
        const formData = {
            fullName: document.getElementById('formFullName').value.trim(),
            email: document.getElementById('formEmail').value.trim(),
            phone: document.getElementById('formPhone').value.trim(),
            address: document.getElementById('formAddress').value.trim(),
            dateOfBirth: document.getElementById('formDateOfBirth').value,
            photo: tempPhotoData
        };
        
        if (!formData.photo) {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            formData.photo = currentUser.photo || '';
        }

        if (isSaving) return; // Prevent double click

        isSaving = true;
        saveBtn.disabled = true;
        const originalHTML = saveBtn.innerHTML;
        saveBtn.innerHTML = 'Saving... <i class="fas fa-spinner fa-spin"></i>';

        const success = await saveProfileToSupabase(formData, supabaseClient);

        if (success) {
            localStorage.setItem('currentUser', JSON.stringify(formData));
            await loadUserDataFromSupabase(supabaseClient);
            loadAndUpdateProfile();
            showNotification('Profile updated successfully!', 'success');
            cancelEdit();
        } else {
            showNotification('Failed to update profile. Please try again.', 'error');
        }

        // Reset button state
        isSaving = false;
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalHTML;
    }
}

function populateEditForm(user) {
    const formFullName = document.getElementById('formFullName');
    const formEmail = document.getElementById('formEmail');
    const formPhone = document.getElementById('formPhone');
    const formAddress = document.getElementById('formAddress');
    const formDateOfBirth = document.getElementById('formDateOfBirth');
    const photoPreview = document.getElementById('photoPreview');
    const photoPlaceholder = document.getElementById('photoPlaceholder');
    
    if (formFullName) formFullName.value = user.fullName || '';
    if (formEmail) formEmail.value = user.email || '';
    if (formPhone) formPhone.value = user.phone || '';
    if (formAddress) formAddress.value = user.address || '';
    if (formDateOfBirth) formDateOfBirth.value = user.dateOfBirth || '';

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
            phone_number: formData.phone,
            address: formData.address,
            date_of_birth: formData.dateOfBirth || null,
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