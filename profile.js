document.addEventListener('DOMContentLoaded', function() {
    loadAndUpdateProfile();
    
    // Back button
    const backBtn = document.querySelector('.header i');
    if (backBtn) {
        backBtn.style.cursor = 'pointer';
        backBtn.addEventListener('click', () => {
            window.history.back();
        });
    }

    // Setup editors
    setupFieldEditors();
    setupPhotoUpload();
});

function loadAndUpdateProfile() {
    const currentUser = localStorage.getItem('currentUser');
    let user = currentUser ? JSON.parse(currentUser) : {};
    let completionPercentage = calculateCompletion(user);

    updateProfileDisplay(user);
    updateProfileCompletion(completionPercentage);
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
    document.getElementById('profileName').textContent = user.fullName || 'Your Name';
    document.getElementById('personalFullName').textContent = user.fullName || 'Your Name';
    document.getElementById('profileEmail').textContent = user.email || 'your@email.com';
    document.getElementById('personalEmail').textContent = user.email || 'your@email.com';
    
    // Update text fields
    ['phone', 'address', 'dateOfBirth'].forEach(field => {
        const fieldElement = document.querySelector(`[data-field="${field}"] p`);
        if (fieldElement) {
            fieldElement.textContent = user[field] || `Add your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
        }
    });
    
    // Update photo
    updatePhotoDisplay(user.photo);
}

function updatePhotoDisplay(photoData) {
    const avatar = document.getElementById('userAvatar');
    const photoInput = document.getElementById('photoInput');
    
    if (photoData && photoData.trim() !== '') {
        avatar.classList.add('has-photo');
        // If it's base64 data, use directly; if URL, use URL
        const imgSrc = photoData.startsWith('data:image') ? photoData : photoData;
        avatar.innerHTML = `
            <img src="${imgSrc}" alt="Profile Photo" onerror="handlePhotoError()">
            <span class="edit" title="Change Photo"><i class="fas fa-camera"></i></span>
            ${photoInput.outerHTML}
        `;
    } else {
        avatar.classList.remove('has-photo');
        avatar.innerHTML = `
            <span class="edit" title="Upload Photo"><i class="fas fa-camera"></i></span>
            ${photoInput.outerHTML}
        `;
    }
}

function updateProfileCompletion(percentage) {
    const progressFill = document.getElementById('progressFill');
    const completionText = document.getElementById('completionText');
    
    percentage = Math.min(100, Math.max(0, percentage));
    progressFill.style.width = percentage + '%';
    
    if (percentage === 100) {
        completionText.textContent = '100% Complete 🎉 Perfect!';
        completionText.classList.add('perfect');
    } else {
        completionText.textContent = percentage + '% Complete';
        completionText.classList.remove('perfect');
    }
    
    updateFieldIcons(percentage);
}

function updateFieldIcons(percentage) {
    const items = document.querySelectorAll('.item');
    const totalFields = 6;
    const completedFields = Math.round((percentage / 100) * totalFields);
    
    items.forEach((item, index) => {
        const icon = item.querySelector('.icon');
        if (index < completedFields) {
            icon.classList.add('complete');
        } else {
            icon.classList.remove('complete');
        }
    });
}

function setupFieldEditors() {
    document.querySelectorAll('.item[data-field]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const field = this.dataset.field;
            if (field !== 'photo') { // Photo handled separately
                editField(field);
            }
        });
    });
}

function setupPhotoUpload() {
    const photoInput = document.getElementById('photoInput');
    const avatar = document.getElementById('userAvatar');
    
    // Handle file selection
    photoInput.addEventListener('change', handlePhotoUpload);
    
    // Handle camera button clicks (dynamic)
    avatar.addEventListener('click', function(e) {
        if (e.target.closest('.edit') || !this.classList.contains('has-photo')) {
            photoInput.click();
        }
    });
}

function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'warning');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('Image too large (max 5MB)', 'warning');
        return;
    }
    
    // Show loading
    showToast('Uploading photo...', 'info');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const photoData = e.target.result; // Base64 data URL
        saveField('photo', photoData);
        showToast('Photo uploaded successfully! ✅', 'success');
    };
    reader.onerror = function() {
        showToast('Failed to read image', 'warning');
    };
    reader.readAsDataURL(file);
}

function editField(field) {
    const currentUser = localStorage.getItem('currentUser');
    const user = currentUser ? JSON.parse(currentUser) : {};
    let currentValue = user[field] || '';
    
    let placeholder = `Enter your ${field.replace('_', ' ').replace(/([A-Z])/g, ' $1').toLowerCase()}`;
    let newValue;
    
    if (field === 'dateOfBirth') {
        newValue = prompt(placeholder + '\n(Format: YYYY-MM-DD)', currentValue);
    } else if (field === 'phone') {
        newValue = prompt(placeholder + '\n(Format: +63 912 345 6789)', currentValue);
    } else {
        newValue = prompt(placeholder, currentValue);
    }
    
    if (newValue !== null && newValue.trim() !== currentValue.trim()) {
        saveField(field, newValue.trim());
    }
}

function saveField(field, value) {
    const currentUser = localStorage.getItem('currentUser');
    let user = currentUser ? JSON.parse(currentUser) : {};
    
    user[field] = value;
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    loadAndUpdateProfile();
}

function handlePhotoError() {
    showToast('Photo failed to load, using default avatar', 'warning');
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        const user = JSON.parse(currentUser);
        delete user.photo;
        localStorage.setItem('currentUser', JSON.stringify(user));
        loadAndUpdateProfile();
    }
}

function showToast(message, type = 'info') {
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => toast.style.transform = 'translateX(0)');
    
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}