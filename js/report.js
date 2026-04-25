// Report page - Submit new report with manual location override
const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';

window.currentLocation = null;
window.locationAddress = null;
window.selectedPhoto = null;
window.currentLatitude = null;
window.currentLongitude = null;

document.addEventListener('DOMContentLoaded', async function() {
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
        window.location.href = '../pages/login.html';
        return;
    }
    const user = JSON.parse(currentUserStr);
    if (!user.id) {
        localStorage.removeItem('currentUser');
        window.location.href = '../pages/login.html';
        return;
    }
    
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
    
    previewDiv.style.display = 'none';
    
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.onclick = () => {
            cards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        };
    });
    
    uploadBox.onclick = () => handlePhotoUpload(previewDiv, uploadBox);
    
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    if (removePhotoBtn) {
        removePhotoBtn.onclick = () => {
            previewDiv.style.display = 'none';
            window.selectedPhoto = null;
            const previewImg = document.getElementById('previewImg');
            if (previewImg) previewImg.src = '';
            const uploadArea = document.querySelector('.upload-area');
            if (uploadArea && !uploadArea.contains(uploadBox)) {
                uploadArea.insertBefore(uploadBox, previewDiv);
            }
        };
    }
    
    if (backBtn) backBtn.onclick = () => window.history.back();
    
    await getCurrentLocation(locationAddressSpan);
    
    refreshLocationBtn.onclick = async () => {
        await getCurrentLocation(locationAddressSpan);
    };
    
    changeLocationBtn.onclick = () => {
        if (window.locationAddress && window.locationAddress !== 'Fetching address...' && !window.locationAddress.includes('Permission denied')) {
            manualAddressInput.value = window.locationAddress;
        } else {
            manualAddressInput.value = '';
        }
        locationModal.style.display = 'flex';
    };
    
    const closeModal = () => {
        locationModal.style.display = 'none';
    };
    if (closeModalBtn) closeModalBtn.onclick = closeModal;
    if (cancelLocationBtn) cancelLocationBtn.onclick = closeModal;
    window.onclick = (e) => {
        if (e.target === locationModal) closeModal();
    };
    
    applyLocationBtn.onclick = () => {
        let newAddress = manualAddressInput.value.trim();
        if (newAddress) {
            window.locationAddress = newAddress;
            locationAddressSpan.textContent = newAddress;
            if (!window.currentLocation) {
                window.currentLocation = 'Manual location';
            }
            closeModal();
        } else {
            alert('Please enter the location address.');
        }
    };
    
    submitBtn.onclick = () => submitReport(supabaseClient, user);
    
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
            // Silent fail
        }
        return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    
    async function getCurrentLocation(addressSpan) {
        addressSpan.textContent = 'Acquiring GPS signal...';
        
        if (!navigator.geolocation) {
            addressSpan.textContent = 'Geolocation not supported';
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
            window.currentLatitude = latitude;
            window.currentLongitude = longitude;
            window.currentLocation = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            
            addressSpan.textContent = 'Fetching address...';
            const address = await fetchAddressFromCoords(latitude, longitude);
            window.locationAddress = address;
            addressSpan.textContent = address;
            
        } catch (geoError) {
            let errorMsg = 'Location access denied. Click "Change Location" to enter manually.';
            if (geoError.code === 2) errorMsg = 'Position unavailable. Use "Change Location".';
            else if (geoError.code === 3) errorMsg = 'GPS timeout. Use "Change Location".';
            addressSpan.textContent = errorMsg;
            window.currentLocation = null;
        }
    }
    
    function handlePhotoUpload(previewDiv, uploadBox) {
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
                    // Store the FULL base64 string including the data URL prefix
                    window.selectedPhoto = ev.target.result;
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
        if (!window.currentLocation && !window.locationAddress) {
            alert('Location is required. Please refresh GPS or manually change location.');
            return;
        }
        
        const category = activeCard.querySelector('h4').textContent.trim();
        const submitButton = document.getElementById('submitBtn');
        const originalHtml = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        submitButton.disabled = true;
        
        try {
            const date = new Date();
            const year = date.getFullYear();
            const timestamp = Math.floor(date.getTime() / 1000);
            const random = Math.floor(Math.random() * 999);
            const refNum = `ISC-${year}-${timestamp}-${random}`;
            
            // Make sure image_url is properly set
            let imageUrl = null;
            if (window.selectedPhoto) {
                imageUrl = window.selectedPhoto;
            }
            
            const reportData = {
                user_id: user.id,
                category: category,
                description: description,
                image_url: imageUrl,
                location: window.currentLocation || window.locationAddress,
                location_address: window.locationAddress || window.currentLocation,
                latitude: window.currentLatitude || null,
                longitude: window.currentLongitude || null,
                status: 'pending',
                reference: refNum,
                created_at: new Date().toISOString()
            };
            
            // Debug: Check what we're submitting
            console.log('Submitting report:', {
                ...reportData,
                image_url: reportData.image_url ? 'Image present (length: ' + reportData.image_url.length + ')' : 'No image'
            });
            
            const { error } = await supabaseClient.from('reports').insert([reportData]);
            if (error) throw new Error(error.message);
            
            alert(`Report submitted successfully!\nReference: ${refNum}`);
            window.location.href = '../pages/view-reports.html';
        } catch (err) {
            alert(`Submission failed: ${err.message}`);
        } finally {
            submitButton.innerHTML = originalHtml;
            submitButton.disabled = false;
        }
    }
});