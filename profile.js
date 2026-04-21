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

    // Setup edit profile functionality
    setupEditProfile();
    setupPhotoUpload();
});

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
    
    if (photoData && photoData.trim() !== '') {
        avatar.classList.add('has-photo');
        avatar.innerHTML = `
            <img src="${photoData}" alt="Profile Photo" onerror="handlePhotoError()">
            <span class="edit" title="Change Photo"><i class="fas fa-camera"></i></span>
        `;
    } else {
        avatar.classList.remove('has-photo');
        avatar.innerHTML = `
            <span class="edit" title="Upload Photo"><i class="fas fa-camera"></i></span>
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

function setupEditProfile() {
    const editBtn = document.getElementById('editProfileBtn');
    const form = document.getElementById('editProfileForm');
    const cancelBtn = document.getElementById('cancelEdit');
    const saveBtn = document.getElementById('saveProfile');

    editBtn.addEventListener('click', () => {
        form.classList.add('active');
        document.querySelector('.profile').style.display = 'none';
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'none';
        });
    });

    cancelBtn.addEventListener('click', cancelEdit);
    saveBtn.addEventListener('click', saveProfile);

    function cancelEdit() {
        form.classList.remove('active');
        document.querySelector('.profile').style.display = 'block';
        document.querySelectorAll('.section').forEach(section => {
            section.style.display = 'block';
        });
        populateEditForm(JSON.parse(localStorage.getItem('currentUser') || '{}'));
    }

    function saveProfile() {
        const formData = {
            fullName: document.getElementById('formFullName').value.trim(),
            email: document.getElementById('formEmail').value.trim(),
            phone: document.getElementById('formPhone').value.trim(),
            address: document.getElementById('formAddress').value.trim(),
            dateOfBirth: document.getElementById('formDateOfBirth').value
        };

        // Get photo from localStorage
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        formData.photo = currentUser.photo || '';

        // Save to localStorage
        localStorage.setItem('currentUser', JSON.stringify(formData));
        
        // Update display
        loadAndUpdateProfile();
        
        // Hide form
        cancelEdit();
    }
}

function populateEditForm(user) {
    document.getElementById('formFullName').value = user.fullName || '';
    document.getElementById('formEmail').value = user.email || '';
    document.getElementById('formPhone').value = user.phone || '';
    document.getElementById('formAddress').value = user.address || '';
    document.getElementById('formDateOfBirth').value = user.dateOfBirth || '';

    // Update photo preview
    const photoPreview = document.getElementById('photoPreview');
    const photoPlaceholder = document.getElementById('photoPlaceholder');
    
    if (user.photo && user.photo.trim() !== '') {
        photoPreview.src = user.photo;
        photoPreview.style.display = 'block';
        photoPlaceholder.style.display = 'none';
    } else {
        photoPreview.style.display = 'none';
        photoPlaceholder.style.display = 'flex';
    }
}

function setupPhotoUpload() {
    const photoInput = document.getElementById('photoInput');
    const changePhotoBtn = document.getElementById('changePhotoBtn');
    const photoPreview = document.getElementById('photoPreview');
    const photoPlaceholder = document.getElementById('photoPlaceholder');

    // Handle file selection
    photoInput.addEventListener('change', handlePhotoUpload);

    // Change photo button
    changePhotoBtn.addEventListener('click', () => photoInput.click());

    // Photo placeholder click
    photoPlaceholder.addEventListener('click', () => photoInput.click());

    function handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('Image too large (max 5MB)');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const photoData = e.target.result;
            
            // Update preview
            photoPreview.src = photoData;
            photoPreview.style.display = 'block';
            photoPlaceholder.style.display = 'none';
            
            // Save to localStorage
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            currentUser.photo = photoData;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            loadAndUpdateProfile();
        };
        reader.onerror = function() {
            alert('Failed to read image');
        };
        reader.readAsDataURL(file);
    }
}

function handlePhotoError() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        const user = JSON.parse(currentUser);
        delete user.photo;
        localStorage.setItem('currentUser', JSON.stringify(user));
        loadAndUpdateProfile();
    }
}