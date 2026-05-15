// Global state
let spots = [];
let currentFilter = 'all';
let currentEditingSpot = null;
let spotImageFile = null;
let souvenirImageFile = null;
let spotImageDataUrl = null;
let souvenirImageDataUrl = null;
let spotSouvenirs = {};
let souvenirs = [];
let deleteSpotId = null;
let pendingSouvenirs = []; 
let spotDrivers = {}; // Store local drivers for each spot

window.goBack = function() {
    window.location.href = 'admin-homepage.html';
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async function() {
    if (typeof supabase === 'undefined') {
        showNotification('Error: Supabase SDK failed to load. Please refresh.', 'error');
        return;
    }

    const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

    window.supabaseClient = supabaseClient;
    
    // Setup validation for form inputs
    setupInputValidation();
    
    await loadSpots();
    setupFilterTabs();
    setupForms();
    setupImageUploads();
    
    // Prevent Enter key from submitting forms globally
    document.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            // Check if the active element is a button, submit input, or if we're in a modal that should submit
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.type === 'submit' || activeElement.tagName === 'BUTTON')) {
                // Let the button's own click handler work
                return;
            }
            // Otherwise, prevent default to avoid accidental form submissions
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                event.preventDefault();
            }
        }
    });
});

// ========== INPUT VALIDATION SETUP ==========
function setupInputValidation() {
    // Validate tourist spot name (letters only)
    const spotNameInput = document.getElementById('spotName');
    if (spotNameInput) {
        spotNameInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
        });
    }
    
    // Validate driver name (letters only)
    const driverNameInput = document.getElementById('driverName');
    if (driverNameInput) {
        driverNameInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
        });
    }
    
    // Validate driver contact number (numbers only, max 11)
    const driverContactInput = document.getElementById('driverContactNumber');
    if (driverContactInput) {
        driverContactInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '').slice(0, 11);
        });
    }
    
    // Validate souvenir name (letters only)
    const souvenirNameInput = document.getElementById('souvenirName');
    if (souvenirNameInput) {
        souvenirNameInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
        });
    }
    
    // Validate souvenir price (numbers only, no decimals)
    const souvenirPriceInput = document.getElementById('souvenirPrice');
    if (souvenirPriceInput) {
        souvenirPriceInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/[^0-9]/g, '');
        });
    }
}

// ========== LOAD SPOTS ==========
async function loadSpots() {
    try {
        const { data, error } = await window.supabaseClient
            .from('tourist_spots')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        spots = data || [];
        
        // Load local drivers for each spot
        for (let spot of spots) {
            const { data: drivers, error: driversError } = await window.supabaseClient
                .from('spot_drivers')
                .select('*')
                .eq('tourist_spot_id', spot.id)
                .order('created_at', { ascending: true });
            
            if (!driversError) {
                spotDrivers[spot.id] = drivers || [];
            } else {
                spotDrivers[spot.id] = [];
            }
            
            const { count } = await window.supabaseClient
                .from('souvenirs')
                .select('*', { count: 'exact', head: true })
                .eq('tourist_spot_id', spot.id);
            spot.souvenirCount = count || 0;
        }
        
        renderSpots();
    } catch (error) {
        showNotification('Failed to load tourist spots', 'error');
        document.getElementById('spotList').innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Failed to load tourist spots</p>
            </div>
        `;
    }
}

async function renderSpots() {
    const container = document.getElementById('spotList');
    
    const filteredSpots = currentFilter === 'all' 
        ? spots 
        : spots.filter(s => s.category === currentFilter);

    if (filteredSpots.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-map-location-dot"></i>
                <p>No tourist spots found</p>
                <p style="font-size: 12px; margin-top: 8px;">Click + to add your first spot</p>
            </div>
        `;
        return;
    }

    for (let spot of filteredSpots) {
        try {
            const { data, error } = await window.supabaseClient
                .from('souvenirs')
                .select('*')
                .eq('tourist_spot_id', String(spot.id));
            
            if (error) throw error;
            spotSouvenirs[spot.id] = data || [];
        } catch (err) {
            spotSouvenirs[spot.id] = [];
        }
    }

    container.innerHTML = filteredSpots.map(spot => {
        const categoryClass = spot.category === 'Beach' ? 'beach' : 'landmark';
        const visibilityClass = spot.is_visible ? 'visible' : 'hidden';
        const visibilityText = spot.is_visible ? '<i class="fa-solid fa-eye"></i> Visible' : '<i class="fa-solid fa-eye-slash"></i> Hidden';
        
        // Get local drivers for this spot
        const drivers = spotDrivers[spot.id] || [];
        let driversHtml = '';
        
        if (drivers.length > 0) {
            driversHtml = `
                <div class="spot-drivers-list">
                    <p class="spot-drivers-label"><i class="fa-solid fa-users"></i> Local Drivers:</p>
                    ${drivers.map(driver => `
                        <div class="spot-driver-item">
                            <i class="fa-solid fa-user"></i> ${escapeHtml(driver.driver_name)}
                            ${driver.driver_contact_number ? `<span class="spot-driver-contact"><i class="fa-solid fa-phone"></i> ${escapeHtml(driver.driver_contact_number)}</span>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            driversHtml = '<p class="spot-no-drivers">No local drivers added</p>';
        }
            
        const dateStr = spot.created_at 
            ? new Date(spot.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';

        const souvenirsForSpot = spotSouvenirs[spot.id] || [];
        
        let souvenirsHtml = '';
        if (souvenirsForSpot.length > 0) {
            souvenirsHtml = souvenirsForSpot.map(s => {
                const priceFormatted = parseFloat(s.price).toFixed(0);
                const souvenirImage = s.image_url 
                    ? `<img class="spot-souvenir-img" src="${escapeHtml(s.image_url)}" alt="${escapeHtml(s.name)}" onerror="this.style.display='none'">`
                    : `<div class="spot-souvenir-img-placeholder"><i class="fa-solid fa-gift"></i></div>`;
                return `
                    <div class="spot-souvenir-item">
                        <div class="spot-souvenir-img-wrap">
                            ${souvenirImage}
                        </div>
                        <div class="spot-souvenir-info">
                            <span class="spot-souvenir-name">${escapeHtml(s.name)}</span>
                            <span class="spot-souvenir-price">₱${priceFormatted}</span>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            souvenirsHtml = '<p class="spot-no-souvenirs">No souvenirs yet</p>';
        }

        const imageHtml = spot.image_url 
            ? `<img class="spot-image" src="${escapeHtml(spot.image_url)}" alt="${escapeHtml(spot.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : '';

        const placeholderHtml = !spot.image_url 
            ? `<div class="spot-image-placeholder"><i class="fa-solid fa-image"></i></div>`
            : `<div class="spot-image-placeholder" style="display:none"><i class="fa-solid fa-image"></i></div>`;

        return `
            <div class="spot-card" data-id="${spot.id}">
                ${imageHtml}
                ${placeholderHtml}
                <div class="spot-body">
                    <div class="spot-header">
                        <span class="spot-tag ${categoryClass}">${escapeHtml(spot.category)}</span>
                        <span class="spot-visibility-badge ${visibilityClass}">${visibilityText}</span>
                    </div>
                    <h3 class="spot-name">${escapeHtml(spot.name)}</h3>
                    ${spot.location ? `<p class="spot-location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(spot.location)}</p>` : ''}
                    ${driversHtml}
                    <div class="spot-souvenirs-list">
                        <p class="spot-souvenirs-label"><i class="fa-solid fa-gift"></i> Souvenirs:</p>
                        ${souvenirsHtml}
                    </div>
                    <p class="spot-date"><i class="fa-regular fa-calendar"></i> ${dateStr}</p>
                    <div class="spot-meta">
                        <span></span>
                        <div class="spot-actions">
                            <button class="edit-btn" onclick="editSpot('${spot.id}')" title="Edit">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="delete-btn" onclick="deleteSpot('${spot.id}')" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ========== FILTER TABS ==========
function setupFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderSpots();
        });
    });
}

// ========== SPOT MODAL ==========
window.openSpotModal = function(spotId = null) {
    const modal = document.getElementById('spotModal');
    const form = document.getElementById('spotForm');
    const title = document.getElementById('modalTitle');
    const souvenirSection = document.getElementById('souvenirSection');
    
    form.reset();
    document.getElementById('spotId').value = '';
    spotImageDataUrl = null;
    spotImageFile = null;
    pendingSouvenirs = [];
    
    document.getElementById('spotUploadBox').style.display = 'flex';
    document.getElementById('spotPreviewDiv').style.display = 'none';
    document.getElementById('spotPreviewImg').src = '';
    
    if (spotId) {
        const spot = spots.find(s => s.id === spotId);
        if (!spot) {
            showNotification('Spot not found', 'error');
            return;
        }
        
        currentEditingSpot = spot;
        title.textContent = 'Edit Tourist Spot';
        document.getElementById('spotId').value = spot.id;
        document.getElementById('spotName').value = spot.name || '';
        document.getElementById('spotCategory').value = spot.category || 'Beach';
        document.getElementById('spotLocation').value = spot.location || '';
        document.getElementById('spotVisible').checked = spot.is_visible !== false;
        
        if (spot.image_url) {
            document.getElementById('spotUploadBox').style.display = 'none';
            document.getElementById('spotPreviewDiv').style.display = 'block';
            document.getElementById('spotPreviewImg').src = spot.image_url;
        }
        
        souvenirSection.style.display = 'block';
        loadSouvenirs(spotId);
        loadLocalDrivers(spotId);
    } else {
        currentEditingSpot = null;
        title.textContent = 'Add Tourist Spot';
        souvenirSection.style.display = 'block';
        souvenirs = [];
        renderSouvenirs();
        renderLocalDrivers();
    }
    
    modal.classList.add('show');
};

window.closeSpotModal = function() {
    document.getElementById('spotModal').classList.remove('show');
    currentEditingSpot = null;
    pendingSouvenirs = [];
};

window.removeSpotImage = function() {
    spotImageDataUrl = null;
    spotImageFile = null;
    document.getElementById('spotUploadBox').style.display = 'flex';
    document.getElementById('spotPreviewDiv').style.display = 'none';
    document.getElementById('spotPreviewImg').src = '';
};

// ========== LOCAL DRIVERS MANAGEMENT ==========
async function loadLocalDrivers(spotId) {
    try {
        const { data, error } = await window.supabaseClient
            .from('spot_drivers')
            .select('*')
            .eq('tourist_spot_id', spotId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        if (!spotDrivers[spotId]) {
            spotDrivers[spotId] = [];
        }
        spotDrivers[spotId] = data || [];
        renderLocalDrivers();
    } catch (error) {
        console.error('Failed to load local drivers:', error);
        spotDrivers[spotId] = [];
        renderLocalDrivers();
    }
}

function renderLocalDrivers() {
    const container = document.getElementById('driversGrid');
    
    if (!container) return;
    
    const spotId = document.getElementById('spotId').value;
    const drivers = spotId && spotDrivers[spotId] ? spotDrivers[spotId] : [];
    
    if (drivers.length === 0) {
        container.innerHTML = `
            <div class="drivers-empty">
                <i class="fa-solid fa-users"></i>
                <p>No local drivers yet</p>
                <p class="drivers-hint">Click + Add to add local drivers</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = drivers.map(driver => {
        return `
            <div class="driver-item" data-id="${driver.id}">
                <div class="driver-info">
                    <i class="fa-solid fa-user-circle"></i>
                    <div class="driver-details">
                        <p class="driver-name">${escapeHtml(driver.driver_name)}</p>
                        ${driver.driver_contact_number ? `<p class="driver-contact"><i class="fa-solid fa-phone"></i> ${escapeHtml(driver.driver_contact_number)}</p>` : ''}
                    </div>
                </div>
                <div class="driver-actions">
                    <button onclick="editLocalDriver('${driver.id}')" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="deleteLocalDriver('${driver.id}')" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

window.openDriverModal = function(driverId = null) {
    const modal = document.getElementById('driverModal');
    const form = document.getElementById('driverForm');
    const title = document.getElementById('driverModalTitle');
    
    form.reset();
    document.getElementById('driverId').value = '';
    
    const spotId = document.getElementById('spotId')?.value;
    if (spotId && spotId !== '') {
        document.getElementById('driverSpotId').value = String(spotId);
    }
    
    if (driverId) {
        const spotId = document.getElementById('spotId').value;
        const drivers = spotDrivers[spotId] || [];
        const driver = drivers.find(d => d.id === driverId);
        
        if (!driver) {
            showNotification('Local driver not found', 'error');
            return;
        }
        
        title.textContent = 'Edit Local Driver';
        document.getElementById('driverId').value = driver.id;
        document.getElementById('driverName').value = driver.driver_name || '';
        document.getElementById('driverContactNumber').value = driver.driver_contact_number || '';
    } else {
        title.textContent = 'Add Local Driver';
    }
    
    modal.classList.add('show');
};

window.closeDriverModal = function() {
    document.getElementById('driverModal').classList.remove('show');
};

async function saveDriver() {
    const saveBtn = document.getElementById('driverSaveBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        const driverId = document.getElementById('driverId').value;
        const driverName = document.getElementById('driverName').value.trim();
        const driverContactNumber = document.getElementById('driverContactNumber').value.trim();
        
        const spotId = document.getElementById('spotId').value;

        // Validation: Driver name (letters only)
        if (!driverName) {
            showNotification('Please enter a driver name', 'error');
            return;
        }
        
        const lettersOnlyRegex = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
        if (!lettersOnlyRegex.test(driverName)) {
            showNotification('Driver name should contain letters only (A-Z, spaces allowed)', 'error');
            return;
        }

        if (!spotId) {
            showNotification('Please save the tourist spot first before adding local drivers', 'error');
            closeDriverModal();
            return;
        }

        // Validation: Contact number (exactly 11 digits if provided)
        if (driverContactNumber) {
            const digitsOnlyRegex = /^\d{11}$/;
            if (!digitsOnlyRegex.test(driverContactNumber)) {
                showNotification('Contact number must be exactly 11 digits (numbers only)', 'error');
                return;
            }
        }

        const driverData = {
            tourist_spot_id: spotId,
            driver_name: driverName,
            driver_contact_number: driverContactNumber || null
        };

        if (driverId) {
            const { error } = await window.supabaseClient
                .from('spot_drivers')
                .update(driverData)
                .eq('id', driverId);

            if (error) throw new Error(`Update failed: ${error.message}`);
            showInContainerNotification('driverModalNotification', 'Local driver updated successfully!', 'success');
        } else {
            const { error } = await window.supabaseClient
                .from('spot_drivers')
                .insert([driverData]);

            if (error) throw new Error(`Insert failed: ${error.message}`);
            showInContainerNotification('driverModalNotification', 'Local driver added successfully!', 'success');
        }

        setTimeout(() => {
            closeDriverModal();
            if (currentEditingSpot) {
                loadLocalDrivers(currentEditingSpot.id);
            }
        }, 1500);

    } catch (error) {
        console.error('saveDriver error:', error);
        showNotification('Failed to save local driver: ' + error.message, 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

window.editLocalDriver = function(driverId) {
    openDriverModal(driverId);
};

window.deleteLocalDriver = async function(driverId) {
    if (!confirm('Are you sure you want to delete this local driver?')) {
        return;
    }

    try {
        const { error } = await window.supabaseClient
            .from('spot_drivers')
            .delete()
            .eq('id', driverId);

        if (error) throw error;

        showNotification('Local driver deleted successfully', 'success');
        
        if (currentEditingSpot) {
            await loadLocalDrivers(currentEditingSpot.id);
        }

    } catch (error) {
        showNotification('Failed to delete local driver', 'error');
    }
};

// ========== FORMS ==========
function setupForms() {
    const spotForm = document.getElementById('spotForm');
    if (spotForm) {
        spotForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveSpot();
        });
    }

    const souvenirForm = document.getElementById('souvenirForm');
    if (souvenirForm) {
        souvenirForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveSouvenir();
        });
    }
    
    const driverForm = document.getElementById('driverForm');
    if (driverForm) {
        driverForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await saveDriver();
        });
    }
    
    // Prevent Enter key from submitting forms unexpectedly
    const forms = [spotForm, souvenirForm, driverForm];
    forms.forEach(form => {
        if (form) {
            form.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    // Check if the Enter key was pressed on an input that is not a submit button
                    const target = e.target;
                    if (target.tagName === 'INPUT' && target.type !== 'submit' && target.type !== 'button') {
                        e.preventDefault();
                        // Don't submit automatically
                        return false;
                    }
                }
            });
        }
    });
}

// ========== IMAGE UPLOADS ==========
function setupImageUploads() {
    const spotImageInput = document.getElementById('spotImageInput');
    spotImageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.match(/image\/(jpeg|png|jpg)/)) {
            showNotification('Please upload a JPEG or PNG image', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image must be less than 5MB', 'error');
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

                spotImageDataUrl = compressedDataUrl;
                document.getElementById('spotPreviewImg').src = compressedDataUrl;
                document.getElementById('spotUploadBox').style.display = 'none';
                document.getElementById('spotPreviewDiv').style.display = 'block';

                if (estimatedBytes > MAX_UPLOAD_BYTES) {
                    showNotification('Spot image selected, but it may still be larger than 70KB after compression.', 'error');
                }
            };
            img.onerror = () => {
                spotImageDataUrl = originalDataUrl;
                document.getElementById('spotPreviewImg').src = originalDataUrl;
                document.getElementById('spotUploadBox').style.display = 'none';
                document.getElementById('spotPreviewDiv').style.display = 'block';
                showNotification('Spot image selected. Compression may have failed.', 'error');
            };
            img.src = originalDataUrl;
        };
        reader.readAsDataURL(file);
    });

    const souvenirImageInput = document.getElementById('souvenirImageInput');
    souvenirImageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.match(/image\/(jpeg|png|jpg)/)) {
            showNotification('Please upload a JPEG or PNG image', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showNotification('Image must be less than 5MB', 'error');
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

                souvenirImageDataUrl = compressedDataUrl;
                document.getElementById('souvenirPreviewImg').src = compressedDataUrl;
                document.getElementById('souvenirUploadBox').style.display = 'none';
                document.getElementById('souvenirPreviewDiv').style.display = 'block';

                if (estimatedBytes > MAX_UPLOAD_BYTES) {
                    showNotification('Souvenir image selected, but it may still be larger than 70KB after compression.', 'error');
                }
            };
            img.onerror = () => {
                souvenirImageDataUrl = originalDataUrl;
                document.getElementById('souvenirPreviewImg').src = originalDataUrl;
                document.getElementById('souvenirUploadBox').style.display = 'none';
                document.getElementById('souvenirPreviewDiv').style.display = 'block';
                showNotification('Souvenir image selected. Compression may have failed.', 'error');
            };
            img.src = originalDataUrl;
        };
        reader.readAsDataURL(file);
    });
}

// ========== SAVE SPOT ==========
async function saveSpot() {
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        let spotId = document.getElementById('spotId').value;
        const name = document.getElementById('spotName').value.trim();
        const category = document.getElementById('spotCategory').value;
        const location = document.getElementById('spotLocation').value.trim();
        const isVisible = document.getElementById('spotVisible').checked;

        // Validation: Spot name (letters only)
        if (!name) {
            showNotification('Please enter a spot name', 'error');
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            return;
        }
        
        const lettersOnlyRegex = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
        if (!lettersOnlyRegex.test(name)) {
            showNotification('Spot name should contain letters only (A-Z, spaces allowed)', 'error');
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            return;
        }

        const currentSpot = spotId ? spots.find(s => s.id === spotId) : null;

        const spotData = {
            name: name,
            category: category,
            location: location || null,
            is_visible: isVisible
        };

        if (spotImageDataUrl) {
            spotData.image_url = spotImageDataUrl;
        } else if (!spotImageDataUrl && currentSpot && currentSpot.image_url) {
            spotData.image_url = currentSpot.image_url;
        }
        
        if (spotId) {
            const { error } = await window.supabaseClient
                .from('tourist_spots')
                .update(spotData)
                .eq('id', spotId);

            if (error) throw error;
            
            showInContainerNotification('spotModalNotification', 'Tourist spot updated successfully!', 'success');
            await loadSpots();
            closeSpotModal();
            return;
        } else {
            const { data: newSpot, error } = await window.supabaseClient
                .from('tourist_spots')
                .insert([spotData])
                .select()
                .single();

            if (error) throw error;
            
            spotId = newSpot.id;
            currentEditingSpot = newSpot;
            document.getElementById('spotId').value = spotId;
            
            const souvenirField = document.getElementById('souvenirSpotId');
            if (souvenirField) {
                souvenirField.value = String(spotId);
            }
            
            if (pendingSouvenirs.length > 0) {
                showNotification(`Saving ${pendingSouvenirs.length} souvenir(s) for the new spot...`, 'info');
                
                for (const pendingSouvenir of pendingSouvenirs) {
                    const souvenirData = {
                        tourist_spot_id: String(spotId),
                        name: pendingSouvenir.name,
                        price: pendingSouvenir.price,
                        is_available: true,
                        image_url: pendingSouvenir.image_url || null
                    };
                    
                    const { error: souvenirError } = await window.supabaseClient
                        .from('souvenirs')
                        .insert([souvenirData]);
                    
                    if (souvenirError) {
                        console.error('Failed to save pending souvenir:', souvenirError);
                    }
                }
                
                pendingSouvenirs = [];
                showNotification('Spot and souvenirs saved successfully!', 'success');
            } else {
                showNotification('Tourist spot created successfully!', 'success');
            }
            
            await loadSouvenirs(spotId);
            document.getElementById('modalTitle').textContent = 'Edit Tourist Spot';
            await loadSpots();
            closeSpotModal();
            return;
        }
    } catch (error) {
        showNotification('Failed to save tourist spot: ' + error.message, 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ========== EDIT SPOT ==========
window.editSpot = function(spotId) {
    openSpotModal(spotId);
};

// ========== DELETE SPOT ==========
window.deleteSpot = function(spotId) {
    deleteSpotId = spotId;
    const modal = document.getElementById('deleteModal');
    modal.classList.add('show');
};

window.closeDeleteModal = function() {
    document.getElementById('deleteModal').classList.remove('show');
    deleteSpotId = null;
};

window.confirmDelete = async function() {
    if (!deleteSpotId) return;

    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
    confirmBtn.disabled = true;

    try {
        // Delete local drivers first
        const { error: driversError } = await window.supabaseClient
            .from('spot_drivers')
            .delete()
            .eq('tourist_spot_id', deleteSpotId);

        if (driversError) throw driversError;

        const { error: souvenirError } = await window.supabaseClient
            .from('souvenirs')
            .delete()
            .eq('tourist_spot_id', deleteSpotId);

        if (souvenirError) throw souvenirError;

        const { error } = await window.supabaseClient
            .from('tourist_spots')
            .delete()
            .eq('id', deleteSpotId);

        if (error) throw error;

        showNotification('Tourist spot deleted successfully', 'success');
        closeDeleteModal();
        await loadSpots();

    } catch (error) {
        showNotification('Failed to delete tourist spot', 'error');
    } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
};

// ========== SOUVENIRS ==========
async function loadSouvenirs(spotId) {
    try {
        let allSouvenirs;
        
        if (spotId) {
            const spotIdStr = String(spotId);
            
            const { data, error } = await window.supabaseClient
                .from('souvenirs')
                .select('*');

            if (error) throw error;
            
            allSouvenirs = (data || []).filter(s => {
                const souvenirSpotId = String(s.tourist_spot_id);
                const targetId = spotIdStr;
                return souvenirSpotId === targetId || souvenirSpotId === spotId;
            });
        } else {
            const { data, error } = await window.supabaseClient
                .from('souvenirs')
                .select('*');

            if (error) throw error;
            allSouvenirs = data || [];
        }
        
        souvenirs = allSouvenirs || [];
        renderSouvenirs();
    } catch (error) {
        souvenirs = [];
        renderSouvenirs();
    }
}

function renderSouvenirs() {
    const grid = document.getElementById('souvenirGrid');
    
    if (!grid) return;
    
    if (souvenirs.length === 0 && pendingSouvenirs.length === 0) {
        grid.innerHTML = `
            <div class="souvenir-empty">
                <i class="fa-solid fa-gift"></i>
                <p>No souvenirs yet</p>
                <p class="souvenir-hint">Click + Add to add souvenirs</p>
            </div>
        `;
        return;
    }
    
    const allSouvenirs = [...souvenirs, ...pendingSouvenirs];
    
    grid.innerHTML = allSouvenirs.map(souvenir => {
        const souvenirId = souvenir.pending ? souvenir.tempId : String(souvenir.id);
        const priceFormatted = parseFloat(souvenir.price).toFixed(0);
        const isPending = souvenir.pending === true;
        
        return `
            <div class="souvenir-item ${isPending ? 'pending-souvenir' : ''}" data-id="${souvenirId}">
                <div class="souvenir-image">
                    ${souvenir.image_url 
                        ? `<img src="${escapeHtml(souvenir.image_url)}" alt="${escapeHtml(souvenir.name)}" onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\\'fa-solid fa-gift\\'></i>'">`
                        : `<i class="fa-solid fa-gift"></i>`
                    }
                    ${isPending ? '<span class="pending-badge">Pending</span>' : ''}
                </div>
                <div class="souvenir-details">
                    <p class="souvenir-name">${escapeHtml(souvenir.name)}</p>
                    <p class="souvenir-price">₱${priceFormatted}</p>
                </div>
                <div class="souvenir-actions">
                    ${!isPending ? `
                        <button onclick="editSouvenir('${souvenir.id}')" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button onclick="deleteSouvenir('${souvenir.id}')" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    ` : `
                        <button onclick="removePendingSouvenir('${souvenir.tempId}')" title="Remove">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

window.removePendingSouvenir = function(tempId) {
    const index = pendingSouvenirs.findIndex(s => s.tempId === tempId);
    
    if (index !== -1) {
        pendingSouvenirs.splice(index, 1);
        renderSouvenirs();
        showNotification('Pending souvenir removed', 'success');
    } else {
        showNotification('Failed to remove souvenir', 'error');
    }
};

window.openSouvenirModal = function(souvenirId = null) {
    const modal = document.getElementById('souvenirModal');
    const form = document.getElementById('souvenirForm');
    const title = document.getElementById('souvenirModalTitle');
    
    form.reset();
    document.getElementById('souvenirId').value = '';
    souvenirImageDataUrl = null;
    souvenirImageFile = null;
    
    const spotId = document.getElementById('spotId')?.value;
    if (spotId && spotId !== '') {
        document.getElementById('souvenirSpotId').value = String(spotId);
    }
    
    document.getElementById('souvenirUploadBox').style.display = 'flex';
    document.getElementById('souvenirPreviewDiv').style.display = 'none';
    document.getElementById('souvenirPreviewImg').src = '';
    
    if (souvenirId) {
        const souvenir = souvenirs.find(s => s.id === souvenirId);
        if (!souvenir) {
            showNotification('Souvenir not found', 'error');
            return;
        }
        
        title.textContent = 'Edit Souvenir';
        document.getElementById('souvenirId').value = souvenir.id;
        document.getElementById('souvenirName').value = souvenir.name || '';
        document.getElementById('souvenirPrice').value = souvenir.price || '';
        
        if (souvenir.image_url) {
            document.getElementById('souvenirUploadBox').style.display = 'none';
            document.getElementById('souvenirPreviewDiv').style.display = 'block';
            document.getElementById('souvenirPreviewImg').src = souvenir.image_url;
        }
    } else {
        title.textContent = 'Add Souvenir';
    }
    
    modal.classList.add('show');
};

window.closeSouvenirModal = function() {
    document.getElementById('souvenirModal').classList.remove('show');
};

window.removeSouvenirImage = function() {
    souvenirImageDataUrl = null;
    souvenirImageFile = null;
    document.getElementById('souvenirUploadBox').style.display = 'flex';
    document.getElementById('souvenirPreviewDiv').style.display = 'none';
    document.getElementById('souvenirPreviewImg').src = '';
};

async function saveSouvenir() {
    const saveBtn = document.getElementById('souvenirSaveBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        const souvenirId = document.getElementById('souvenirId').value;
        const name = document.getElementById('souvenirName').value.trim();
        const priceRaw = document.getElementById('souvenirPrice').value.trim();

        // Validation: Souvenir name (letters only)
        if (!name) {
            showNotification('Please enter a souvenir name', 'error');
            return;
        }
        
        const lettersOnlyRegex = /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/;
        if (!lettersOnlyRegex.test(name)) {
            showNotification('Souvenir name should contain letters only (A-Z, spaces allowed)', 'error');
            return;
        }

        // Validation: Price (numbers only, positive integer)
        if (!priceRaw) {
            showNotification('Please enter a valid price', 'error');
            return;
        }
        
        const numbersOnlyRegex = /^\d+$/;
        if (!numbersOnlyRegex.test(priceRaw)) {
            showNotification('Price should be numbers only (no decimals or special characters)', 'error');
            return;
        }

        const price = Number(priceRaw);
        if (isNaN(price) || price < 0) {
            showNotification('Please enter a valid price (non-negative exact number)', 'error');
            return;
        }

        let spotId = document.getElementById('spotId')?.value;
        
        if (!spotId || spotId === '') {
            const tempId = 'pending_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const pendingSouvenir = {
                tempId: tempId,
                name: name,
                price: price,
                image_url: souvenirImageDataUrl || null,
                pending: true
            };
            
            pendingSouvenirs.push(pendingSouvenir);
            renderSouvenirs();
            
            document.getElementById('souvenirName').value = '';
            document.getElementById('souvenirPrice').value = '';
            souvenirImageDataUrl = null;
            document.getElementById('souvenirUploadBox').style.display = 'flex';
            document.getElementById('souvenirPreviewDiv').style.display = 'none';
            document.getElementById('souvenirPreviewImg').src = '';
            
            showNotification('Souvenir added to pending list. It will be saved when you save the tourist spot.', 'success');
            closeSouvenirModal();
            return;
        }
        
        spotId = String(spotId);
        
        const currentSouvenir = souvenirId ? souvenirs.find(s => s.id === souvenirId) : null;

        const souvenirData = {
            tourist_spot_id: spotId,
            name: name,
            price: price,
            is_available: true
        };

        if (souvenirImageDataUrl) {
            souvenirData.image_url = souvenirImageDataUrl;
        } else if (!souvenirImageDataUrl && currentSouvenir && currentSouvenir.image_url) {
            souvenirData.image_url = currentSouvenir.image_url;
        }

        if (souvenirId) {
            const { error } = await window.supabaseClient
                .from('souvenirs')
                .update(souvenirData)
                .eq('id', souvenirId);

            if (error) throw new Error(`Update failed: ${error.message}`);
            showInContainerNotification('souvenirModalNotification', 'Souvenir updated successfully!', 'success');
        } else {
            const { error } = await window.supabaseClient
                .from('souvenirs')
                .insert([souvenirData]);

            if (error) throw new Error(`Insert failed: ${error.message}`);
            showInContainerNotification('souvenirModalNotification', 'Souvenir added successfully!', 'success');
        }

        setTimeout(() => {
            closeSouvenirModal();
            if (currentEditingSpot) {
                loadSouvenirs(currentEditingSpot.id);
            }
        }, 1500);

    } catch (error) {
        console.error('saveSouvenir error:', error);
        showNotification('Failed to save souvenir: ' + error.message, 'error');
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

window.editSouvenir = function(souvenirId) {
    openSouvenirModal(souvenirId);
};

window.deleteSouvenir = async function(souvenirId) {
    if (!confirm('Are you sure you want to delete this souvenir?')) {
        return;
    }

    try {
        const { error } = await window.supabaseClient
            .from('souvenirs')
            .delete()
            .eq('id', souvenirId);

        if (error) throw error;

        showNotification('Souvenir deleted successfully', 'success');
        
        if (currentEditingSpot) {
            await loadSouvenirs(currentEditingSpot.id);
        }

    } catch (error) {
        showNotification('Failed to delete souvenir', 'error');
    }
};

// ========== NOTIFICATION SYSTEM ==========
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification && notification.parentNode) notification.remove();
    }, 3000);
}

function showInContainerNotification(containerId, message, type = 'success') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    const notification = document.createElement('div');
    notification.className = `in-container-notification ${type}`;
    
    const iconClass = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    notification.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    container.innerHTML = '';
                }
            }, 300);
        }
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        const map = {
            '&': '&lt;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return map[m] || m;
    }); 
}