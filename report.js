// Report page - Submit new report only
// Uses UMD Supabase - supabase.createClient global

const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';

// Global variables for location
window.currentLocation = null;
window.locationAddress = null;
window.selectedPhoto = null;

document.addEventListener('DOMContentLoaded', async function() {
    // Create Supabase client
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Check user
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
    
    const previewDiv = document.querySelector('.preview');
    const uploadBox = document.querySelector('.upload-box');
    previewDiv.style.display = 'none';
    uploadBox.onclick = handlePhotoUpload;
    document.querySelector('.submit').onclick = () => submitReport(supabaseClient, user);
    
    // Get current location immediately
    await getCurrentLocation();
    
    // Common handlers
    document.querySelectorAll('.card').forEach(card => {
        card.onclick = () => {
            document.querySelector('.card.active')?.classList.remove('active');
            card.classList.add('active');
        };
    });
    
    // Location change handler
    const changeLocationBtn = document.getElementById('change-location');
    if (changeLocationBtn) {
        changeLocationBtn.onclick = getCurrentLocation;
    }
    
    document.querySelector('.header i').onclick = () => window.history.back();
});

// ✅ FIXED: Geolocation with CORS proxy fallback
async function getCurrentLocation() {
    const locationDiv = document.querySelector('.location');
    if (!locationDiv) return;
    
    const addressEl = document.getElementById('location-address');
    const coordsEl = document.getElementById('location-coords');
    
    addressEl.textContent = 'Getting current location...';
    coordsEl.textContent = '';
    
    if (!navigator.geolocation) {
        addressEl.textContent = 'Geolocation not supported';
        return;
    }
    
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 30000
            });
        });
        
        const { latitude, longitude } = position.coords;
        window.currentLocation = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        
        // Update coords display
        coordsEl.textContent = window.currentLocation;
        
// ✅ CORS FIXED: Use BigDataCloud API (CORS-enabled, free)
        let address = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
        
        try {
            const response = await fetch(
                `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
                { 
                    headers: { 
                        'User-Agent': 'ISLA-SYNC-App/1.0 (contact@islasync.com)' 
                    }
                }
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data && (data.city || data.locality || data.countryName)) {
                    // Construct address similar to Nominatim display_name
                    const parts = [];
                    if (data.locality) parts.push(data.locality);
                    if (data.city) parts.push(data.city);
                    if (data.province) parts.push(data.province);
                    if (data.countryName) parts.push(data.countryName);
                    address = parts.join(', ') || data.formattedAddress || address;
                }
            }
        } catch (error) {
            console.warn('Reverse geocoding failed:', error);
        }
        
        window.locationAddress = address;
        addressEl.textContent = address;
        
    } catch (error) {
        console.error('Geolocation error:', error);
        addressEl.textContent = 'Location access denied';
        coordsEl.textContent = 'Tap "Refresh Location" to try again';
        window.currentLocation = null;
    }
}

function handlePhotoUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = e => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = e => {
                const previewDiv = document.querySelector('.preview');
                previewDiv.querySelector('img').src = e.target.result;
                previewDiv.querySelector('.remove').onclick = () => {
                    previewDiv.style.display = 'none';
                    document.querySelector('.upload-area').insertBefore(document.querySelector('.upload-box'), previewDiv);
                    window.selectedPhoto = null;
                };
                previewDiv.style.display = 'block';
                document.querySelector('.upload-area').appendChild(previewDiv);
                window.selectedPhoto = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

async function submitReport(supabaseClient, user) {
    const activeCategory = document.querySelector('.card.active');
    const description = document.querySelector('textarea').value.trim();
    
    if (!activeCategory || !description) {
        alert('Please select category and describe issue');
        return;
    }
    
    if (!window.currentLocation) {
        alert('Please get your current location first');
        getCurrentLocation();
        return;
    }
    
    // Show loading
    const submitBtn = document.querySelector('.submit');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
    submitBtn.disabled = true;
    
    try {
        const refNum = `ISC-2024-${Math.floor(Math.random() * 10000)}`;
        const reportData = {
            user_id: user.id,
            category: activeCategory.querySelector('h4').textContent.trim(),
            description,
            image_url: window.selectedPhoto || null,
            location: window.currentLocation,
            location_address: window.locationAddress || window.currentLocation,
            status: 'pending',
            reference: `#${refNum}`,
            created_at: new Date().toISOString()
        };
        
        const { error } = await supabaseClient.from('reports').insert([reportData]);
        if (error) {
            throw new Error(error.message);
        }
        
        alert(`Report submitted successfully!\nReference: ${refNum}`);
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        alert(`Submission failed: ${error.message}`);
        console.error('Submit error:', error);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}