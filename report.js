// Report page - Submit new report with manual location override
// Uses Supabase UMD (global supabase)

const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';

// Global location state
window.currentLocation = null;      // "lat, lng" string
window.locationAddress = null;      // human readable address
window.selectedPhoto = null;        // base64 image

document.addEventListener('DOMContentLoaded', async function() {
    // Initialize Supabase client
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Authentication check
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(currentUserStr);
    if (!user.id) {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
        return;
    }
    
    // DOM Elements
    const previewDiv = document.getElementById('previewDiv');
    const uploadBox = document.getElementById('uploadBox');
    const submitBtn = document.getElementById('submitBtn');
    const backBtn = document.getElementById('backBtn');
    const refreshLocationBtn = document.getElementById('refreshLocationBtn');
    const changeLocationBtn = document.getElementById('changeLocationBtn');
    const locationModal = document.getElementById('locationModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelLocationBtn = document.getElementById('cancelLocationBtn');
    const applyLocationBtn = document.getElementById('applyLocationBtn');
    const manualAddressInput = document.getElementById('manualAddress');
    const locationAddressSpan = document.getElementById('locationAddress');
    
    // Hide preview initially
    previewDiv.style.display = 'none';
    
    // Category selection logic
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.onclick = () => {
            cards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        };
    });
    
    // Photo upload handler
    uploadBox.onclick = () => handlePhotoUpload();
    
    // Remove photo handler
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    if (removePhotoBtn) {
        removePhotoBtn.onclick = () => {
            previewDiv.style.display = 'none';
            window.selectedPhoto = null;
            document.querySelector('.upload-area').insertBefore(uploadBox, previewDiv);
        };
    }
    
    // Back button
    if (backBtn) backBtn.onclick = () => window.history.back();
    
    // Get current location on load (GPS)
    await getCurrentLocation();
    
    // Refresh GPS location
    refreshLocationBtn.onclick = async () => {
        await getCurrentLocation();
    };
    
    // Open manual location modal (CHANGE LOCATION)
    changeLocationBtn.onclick = () => {
        // Pre-fill modal with existing location data
        if (window.locationAddress && window.locationAddress !== 'Fetching address...') {
            manualAddressInput.value = window.locationAddress;
        } else {
            manualAddressInput.value = '';
        }
        locationModal.style.display = 'flex';
    };
    
    // Close modal functions
    const closeModal = () => {
        locationModal.style.display = 'none';
    };
    closeModalBtn.onclick = closeModal;
    cancelLocationBtn.onclick = closeModal;
    window.onclick = (e) => {
        if (e.target === locationModal) closeModal();
    };
    
    // Apply manually changed location
    applyLocationBtn.onclick = () => {
        let newAddress = manualAddressInput.value.trim();
        
        if (newAddress) {
            window.locationAddress = newAddress;
            locationAddressSpan.textContent = newAddress;
        } else {
            alert('Please enter the location address.');
            return;
        }
        
        closeModal();
    };
    
    // Submit report
    submitBtn.onclick = () => submitReport(supabaseClient, user);
    
    // Helper: fetch address from BigDataCloud (CORS friendly)
    async function fetchAddressFromCoords(lat, lng) {
        try {
            const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
                { headers: { 'User-Agent': 'ISLA-SYNC-App/1.0' } }
            );
            if (response.ok) {
                const data = await response.json();
                const parts = [];
                if (data.locality) parts.push(data.locality);
                if (data.city) parts.push(data.city);
                if (data.principalSubdivision) parts.push(data.principalSubdivision);
                if (data.countryName) parts.push(data.countryName);
                return parts.join(', ') || data.formattedAddress || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }
        } catch (err) {
            console.warn('Reverse geocoding error:', err);
        }
        return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    
    // Get GPS location with high accuracy
    async function getCurrentLocation() {
        const addressSpan = document.getElementById('locationAddress');
        
        addressSpan.textContent = ' Acquiring GPS signal...';
        
        if (!navigator.geolocation) {
            addressSpan.textContent = '❌ Geolocation not supported by browser';
            return;
        }
        
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 5000
                });
            });
            
            const { latitude, longitude } = position.coords;
            const coordString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            window.currentLocation = coordString;
            
            // Get human-readable address
            addressSpan.textContent = 'Fetching address...';
            const address = await fetchAddressFromCoords(latitude, longitude);
            window.locationAddress = address;
            addressSpan.textContent = address;
            
        } catch (geoError) {
            console.error('Geolocation error:', geoError);
            let errorMsg = 'Location access denied or unavailable. ';
            if (geoError.code === 1) errorMsg = '📍 Permission denied. Click "Change Location" to enter manually.';
            else if (geoError.code === 2) errorMsg = '📡 Position unavailable. Try "Change Location" to enter manually.';
            else errorMsg = ' GPS timeout. Use "Change Location" button.';
            
            document.getElementById('locationAddress').textContent = errorMsg;
            window.currentLocation = null;
        }
    }
    
    // Photo upload handler (capture or gallery)
    function handlePhotoUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg, image/png, image/jpg';
        input.capture = 'environment';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const previewImg = document.getElementById('previewImg');
                    previewImg.src = ev.target.result;
                    previewDiv.style.display = 'block';
                    window.selectedPhoto = ev.target.result;
                    // reposition upload box if needed
                    const uploadArea = document.querySelector('.upload-area');
                    if (uploadArea.contains(uploadBox) && previewDiv) {
                        uploadArea.appendChild(previewDiv);
                    }
                };
                reader.readAsDataURL(file);
            } else {
                alert('Please select a valid image file.');
            }
        };
        input.click();
    }
    
    // Submit report to Supabase
    async function submitReport(supabaseClient, user) {
        const activeCard = document.querySelector('.card.active');
        const description = document.getElementById('issueDesc').value.trim();
        
        if (!activeCard) {
            alert('Please select a category');
            return;
        }
        if (!description) {
            alert('Please describe the issue in detail');
            return;
        }
        if (!window.currentLocation) {
            alert('Location is required. Please refresh GPS or manually change location.');
            return;
        }
        
        const category = activeCard.querySelector('h4').textContent.trim();
        const submitButton = document.getElementById('submitBtn');
        const originalHtml = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        submitButton.disabled = true;
        
        try {
            const refNum = `ISC-${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 999)}`;
            const reportData = {
                user_id: user.id,
                category: category,
                description: description,
                image_url: window.selectedPhoto || null,
                location: window.currentLocation,
                location_address: window.locationAddress || window.currentLocation,
                status: 'pending',
                reference: `#${refNum}`,
                created_at: new Date().toISOString()
            };
            
            const { error } = await supabaseClient.from('reports').insert([reportData]);
            if (error) throw new Error(error.message);
            
            alert(`✅ Report submitted successfully!\nReference: ${refNum}\nLocation: ${window.locationAddress || window.currentLocation}`);
            window.location.href = 'dashboard.html';
        } catch (err) {
            alert(`❌ Submission failed: ${err.message}`);
            console.error(err);
        } finally {
            submitButton.innerHTML = originalHtml;
            submitButton.disabled = false;
        }
    }
});