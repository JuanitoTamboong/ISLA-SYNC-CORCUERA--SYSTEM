// Report page - Submit new report with manual location override
const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';

window.currentLocation = null;
window.locationAddress = null;
window.selectedPhoto = null;
window.currentLatitude = null;
window.currentLongitude = null;

document.addEventListener('DOMContentLoaded', function() {
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

    const submitSuccessModal = document.getElementById('submitSuccessModal');
    const successModalClose = document.getElementById('successModalClose');
    const viewMyReportsBtn = document.getElementById('viewMyReportsBtn');
    const backToHomeBtn = document.getElementById('backToHomeBtn');
    const referenceNumberEl = document.getElementById('referenceNumber');

    if (submitSuccessModal) {
        // Modal defaults
        submitSuccessModal.style.display = 'none';

        if (successModalClose) {
            successModalClose.onclick = () => {
                submitSuccessModal.style.display = 'none';
                submitSuccessModal.setAttribute('aria-hidden','true');
                document.body.style.overflow = 'auto';
                document.documentElement.style.overflow = '';
            };

        }


        if (viewMyReportsBtn) {
            viewMyReportsBtn.onclick = () => {
                window.location.href = '../pages/view-reports.html';
            };
        }

        if (backToHomeBtn) {
            backToHomeBtn.onclick = () => {
                window.location.href = '../pages/resident-homepage.html';
            };
        }

        window.onclick = (e) => {
            if (e.target === submitSuccessModal) {
                submitSuccessModal.style.display = 'none';
                document.body.style.overflow = 'auto';
                document.documentElement.style.overflow = '';
            }

        };
    }

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
    
    getCurrentLocation(locationAddressSpan);
    
    refreshLocationBtn.onclick = () => {
        getCurrentLocation(locationAddressSpan);
    };
    
    changeLocationBtn.onclick = () => {
        if (window.locationAddress && !window.locationAddress.includes('Getting') && !window.locationAddress.includes('Unable')) {
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
        const newAddress = manualAddressInput.value.trim();
        if (newAddress) {
            window.locationAddress = newAddress;
            locationAddressSpan.textContent = newAddress;
            window.currentLocation = newAddress;
            closeModal();
        } else {
            alert('Please enter the location address.');
        }
    };
    
    submitBtn.onclick = () => submitReport(supabaseClient, user);
    
    function fetchAddressFromCoords(lat, lng) {
        return fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: { 'User-Agent': 'ISLA-SYNC-App/1.0' }
        })
        .then(response => response.json())
        .then(data => {
            const address = data.address;
            if (address) {
                const parts = [];
                if (address.village || address.suburb || address.neighbourhood) {
                    parts.push(address.village || address.suburb || address.neighbourhood);
                }
                if (address.town || address.city || address.municipality) {
                    parts.push(address.town || address.city || address.municipality);
                }
                if (address.state || address.province) {
                    parts.push(address.state || address.province);
                }
                if (address.country) {
                    parts.push(address.country);
                }
                if (parts.length >= 2) {
                    return parts.join(', ');
                }
            }
            return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        })
        .catch(() => {
            return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        });
    }
    
    function getCurrentLocation(addressSpan) {
        addressSpan.textContent = 'Getting your location...';
        
        if (!navigator.geolocation) {
            addressSpan.textContent = 'Geolocation not supported';
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                window.currentLatitude = latitude;
                window.currentLongitude = longitude;
                
                addressSpan.textContent = 'Getting address...';
                
                fetchAddressFromCoords(latitude, longitude)
                    .then(address => {
                        window.locationAddress = address;
                        window.currentLocation = address;
                        addressSpan.textContent = address;
                    })
                    .catch(() => {
                        window.currentLocation = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                        addressSpan.textContent = window.currentLocation;
                    });
            },
            (geoError) => {
                if (geoError.code === 1) {
                    addressSpan.textContent = 'Location permission denied. Use "Change Location" to enter manually.';
                } else if (geoError.code === 2) {
                    addressSpan.textContent = 'Position unavailable. Use "Change Location".';
                } else if (geoError.code === 3) {
                    addressSpan.textContent = 'GPS timeout. Use "Change Location".';
                } else {
                    addressSpan.textContent = 'Unable to get location. Use "Change Location".';
                }
                window.currentLocation = null;
                window.locationAddress = null;
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 5000
            }
        );
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
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const maxWidth = 1024;
                        const maxHeight = 1024;
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > height) {
                            if (width > maxWidth) {
                                height = (height * maxWidth) / width;
                                width = maxWidth;
                            }
                        } else {
                            if (height > maxHeight) {
                                width = (width * maxHeight) / height;
                                height = maxHeight;
                            }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        const MAX_UPLOAD_BYTES = 70 * 1024; // ~70KB

                        const estimateBytesFromDataUrl = (dataUrl) => {
                            // dataUrl format: data:image/jpeg;base64,....
                            const base64 = dataUrl.split(',')[1] || '';
                            const padding = (base64.endsWith('==') ? 2 : (base64.endsWith('=') ? 1 : 0));
                            return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
                        };

                        const compressToTarget = (imgEl) => {
                            // Try different dimensions first, then progressively lower quality.
                            const dimensionSteps = [1024, 768, 512, 384, 256];
                            const qualitySteps = [0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.12, 0.1];

                            for (const maxDim of dimensionSteps) {
                                // Calculate new width/height maintaining aspect ratio.
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
                                    if (bytes <= MAX_UPLOAD_BYTES) {
                                        return dataUrl;
                                    }
                                }
                            }

                            // If we couldn't reach the target, return the smallest attempt we can produce.
                            // We'll do one last aggressive attempt.
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

                        const compressedDataUrl = compressToTarget(img);
                        const estimatedBytes = estimateBytesFromDataUrl(compressedDataUrl);

                        const previewImg = document.getElementById('previewImg');
                        previewImg.src = compressedDataUrl;
                        window.selectedPhoto = compressedDataUrl;
                        previewDiv.style.display = 'block';

                        if (estimatedBytes > MAX_UPLOAD_BYTES) {
                            alert('Photo was compressed, but it may still be larger than 70KB due to the original image size. Please try a smaller image for best results.');
                        }

                        const uploadArea = document.querySelector('.upload-area');
                        if (uploadArea && uploadArea.contains(uploadBox) && previewDiv) {
                            uploadArea.appendChild(previewDiv);
                        }
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                alert('Please select a valid image file.');
            }
        };
        input.click();
    }
    
    function submitReport(supabaseClient, user) {
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
        
        const finalLocation = window.locationAddress || window.currentLocation;
        if (!finalLocation || finalLocation.includes('denied') || finalLocation.includes('Unable') || finalLocation.includes('Getting')) {
            alert('Please provide a valid location. Click "Change Location" to enter your address manually.');
            return;
        }
        
        const category = activeCard.querySelector('h4').textContent.trim();
        const submitButton = document.getElementById('submitBtn');
        const originalHtml = submitButton.innerHTML;
        submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        submitButton.disabled = true;
        
        const date = new Date();
        const year = date.getFullYear();
        const timestamp = Math.floor(date.getTime() / 1000);
        const random = Math.floor(Math.random() * 999);
        const refNum = `ISC-${year}-${timestamp}-${random}`;
        
        const reportData = {
            user_id: user.id,
            category: category,
            description: description,
            image_url: window.selectedPhoto || null,
            location: finalLocation,
            location_address: finalLocation,
            latitude: window.currentLatitude || null,
            longitude: window.currentLongitude || null,
            status: 'pending',
            reference: refNum
        };
        
        supabaseClient.from('reports').insert([reportData])
            .then(({ error }) => {
                if (error) throw error;

                // POPUP SUCCESS INSTEAD OF ALERT + REDIRECT
                if (referenceNumberEl) referenceNumberEl.textContent = refNum;

                if (submitSuccessModal) {
                submitSuccessModal.style.display = 'flex';
                    submitSuccessModal.setAttribute('aria-hidden','false');
                    // Prevent background scroll while keeping modal scrollable
                    document.body.style.overflow = 'hidden';
                    document.documentElement.style.overflow = 'hidden';


                }

                submitButton.innerHTML = originalHtml;
                submitButton.disabled = false;

                // ensure success popup is visible
                if (submitSuccessModal) {
                    submitSuccessModal.style.display = 'flex';
                }

            })
            .catch((err) => {
                alert(`Submission failed: ${err.message}`);
                submitButton.innerHTML = originalHtml;
                submitButton.disabled = false;
            });
    }
});

