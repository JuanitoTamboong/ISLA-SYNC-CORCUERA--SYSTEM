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

    // Setup field editors
    setupFieldEditors();
});

function loadAndUpdateProfile() {
    const currentUser = localStorage.getItem('currentUser');
    let user = currentUser ? JSON.parse(currentUser) : {};
    let completionPercentage = calculateCompletion(user);

    // Update display
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
    
    // Photo
    const avatar = document.getElementById('userAvatar');
    if (user.photo && user.photo.trim() !== '') {
        avatar.classList.add('has-photo');
        avatar.innerHTML = `<img src="${user.photo}" alt="Profile Photo" onerror="handlePhotoError(this)"> <span class="edit" title="Change Photo"><i class="fas fa-camera"></i></span>`;
    } else {
        avatar.classList.remove('has-photo');
        avatar.innerHTML = '<span class="edit" title="Add Photo"><i class="fas fa-camera"></i></span>';
    }
    
    // Update field displays
    ['phone', 'address', 'dateOfBirth'].forEach(field => {
        const fieldElement = document.querySelector(`[data-field="${field}"] p`);
        if (fieldElement) {
            fieldElement.textContent = user[field] || `Add your ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
        }
    });
}

function updateProfileCompletion(percentage) {
    const progressFill = document.getElementById('progressFill');
    const completionText = document.getElementById('completionText');
    
    percentage = Math.min(100, Math.max(0, percentage));
    progressFill.style.width = percentage + '%';
    completionText.textContent = percentage + '% Complete';
    
    if (percentage === 100) {
        completionText.textContent = '100% Complete 🎉 Perfect!';
        completionText.classList.add('perfect');
    } else {
        completionText.classList.remove('perfect');
    }
    
    // Update field completion icons
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
    // Profile items
    document.querySelectorAll('.item[data-field]').forEach(item => {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const field = this.dataset.field;
            editField(field);
        });
    });
    
    // Avatar click
    document.getElementById('userAvatar').addEventListener('click', function(e) {
        if (!this.classList.contains('has-photo')) {
            editField('photo');
        }
    });
}

function editField(field) {
    const currentUser = localStorage.getItem('currentUser');
    const user = currentUser ? JSON.parse(currentUser) : {};
    let currentValue = user[field] || '';
    
    let placeholder = `Enter your ${field.replace('_', ' ').replace(/([A-Z])/g, ' $1').toLowerCase()}`;
    let newValue;
    
    if (field === 'photo') {
        newValue = prompt(placeholder + '\n\nTip: Use https://via.placeholder.com/150 for testing', currentValue);
    } else if (field === 'dateOfBirth') {
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
    
    // Reload profile
    loadAndUpdateProfile();
    
    // Success toast
    showToast(`${field.replace('_', ' ').toUpperCase()} Updated! ✅`, 'success');
}

function handlePhotoError(img) {
    img.parentElement.classList.remove('has-photo');
    const editBtn = document.createElement('span');
    editBtn.className = 'edit';
    editBtn.innerHTML = '<i class="fas fa-camera"></i>';
    editBtn.title = 'Add Photo';
    img.parentElement.appendChild(editBtn);
    img.remove();
    showToast('Photo failed to load', 'warning');
}

function showToast(message, type = 'info') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => toast.style.transform = 'translateX(0)');
    
    // Animate out
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}