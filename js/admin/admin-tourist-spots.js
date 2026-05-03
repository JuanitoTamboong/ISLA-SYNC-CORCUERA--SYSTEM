// Admin Tourist Spots Management Script

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
let pendingSouvenirs = []; // Store souvenirs to be added after spot is created

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
    await loadSpots();
    setupFilterTabs();
    setupForms();
    setupImageUploads();
});

// ========== LOAD SPOTS ==========
async function loadSpots() {
    try {
        const { data, error } = await window.supabaseClient
            .from('tourist_spots')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        spots = data || [];
        
        for (let spot of spots) {
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
        
        const shortDesc = spot.description && spot.description.length > 100
            ? spot.description.substring(0, 100) + '...'
            : (spot.description || 'No description');
            
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
                const souvenirDesc = s.description ? `<p class="spot-souvenir-desc">${escapeHtml(s.description)}</p>` : '';
                return `
                    <div class="spot-souvenir-item">
                        <div class="spot-souvenir-img-wrap">
                            ${souvenirImage}
                        </div>
                        <div class="spot-souvenir-info">
                            <span class="spot-souvenir-name">${escapeHtml(s.name)}</span>
                            ${souvenirDesc}
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
                    <p class="spot-description">${escapeHtml(shortDesc)}</p>
                    ${spot.description ? '' : '<p class="spot-description" style="font-style:italic;color:#9ca3af">No description</p>'}
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
    pendingSouvenirs = []; // Clear pending souvenirs when opening modal
    
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
        document.getElementById('spotDescription').value = spot.description || '';
        document.getElementById('spotVisible').checked = spot.is_visible !== false;
        
        if (spot.image_url) {
            document.getElementById('spotUploadBox').style.display = 'none';
            document.getElementById('spotPreviewDiv').style.display = 'block';
            document.getElementById('spotPreviewImg').src = spot.image_url;
        }
        
        souvenirSection.style.display = 'block';
        loadSouvenirs(spotId);
    } else {
        currentEditingSpot = null;
        title.textContent = 'Add Tourist Spot';
        souvenirSection.style.display = 'block';
        souvenirs = [];
        renderSouvenirs();
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

// ========== FORMS ==========
function setupForms() {
    document.getElementById('spotForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveSpot();
    });

    document.getElementById('souvenirForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveSouvenir();
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
        
        const reader = new FileReader();
        reader.onload = function(e) {
            spotImageDataUrl = e.target.result;
            document.getElementById('spotPreviewImg').src = e.target.result;
            document.getElementById('spotUploadBox').style.display = 'none';
            document.getElementById('spotPreviewDiv').style.display = 'block';
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
        
        const reader = new FileReader();
        reader.onload = function(e) {
            souvenirImageDataUrl = e.target.result;
            document.getElementById('souvenirPreviewImg').src = e.target.result;
            document.getElementById('souvenirUploadBox').style.display = 'none';
            document.getElementById('souvenirPreviewDiv').style.display = 'block';
        };
        reader.readAsDataURL(file);
    });
}

// ========== SAVE SPOT (with pending souvenirs) ==========
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
        const description = document.getElementById('spotDescription').value.trim();
        const isVisible = document.getElementById('spotVisible').checked;

        if (!name) {
            showNotification('Please enter a spot name', 'error');
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            return;
        }

        const currentSpot = spotId ? spots.find(s => s.id === spotId) : null;

        const spotData = {
            name: name,
            category: category,
            location: location || null,
            description: description || null,
            is_visible: isVisible
        };

        if (spotImageDataUrl) {
            spotData.image_url = spotImageDataUrl;
        } else if (!spotImageDataUrl && currentSpot && currentSpot.image_url) {
            spotData.image_url = currentSpot.image_url;
        }
        
        if (spotId) {
            // Update existing spot
            const { error } = await window.supabaseClient
                .from('tourist_spots')
                .update(spotData)
                .eq('id', spotId);

            if (error) throw error;
            
            showInContainerNotification('spotModalNotification', 'Tourist spot updated successfully!', 'success');
            
            await loadSpots();
            
            return;
        } else {
            // Create new spot
            const { data: newSpot, error } = await window.supabaseClient
                .from('tourist_spots')
                .insert([spotData])
                .select()
                .single();

            if (error) throw error;
            
            spotId = newSpot.id;
            currentEditingSpot = newSpot;
            document.getElementById('spotId').value = spotId;
            
            // Update souvenirSpotId field
            const souvenirField = document.getElementById('souvenirSpotId');
            if (souvenirField) {
                souvenirField.value = String(spotId);
            }
            
            // Save any pending souvenirs that were added before spot creation
            if (pendingSouvenirs.length > 0) {
                showNotification(`Saving ${pendingSouvenirs.length} souvenir(s) for the new spot...`, 'info');
                
                for (const pendingSouvenir of pendingSouvenirs) {
                    const souvenirData = {
                        tourist_spot_id: String(spotId),
                        name: pendingSouvenir.name,
                        description: pendingSouvenir.description || null,
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
                
                pendingSouvenirs = []; // Clear pending souvenirs
                showNotification('Spot and souvenirs saved successfully!', 'success');
            } else {
                showNotification('Tourist spot created successfully!', 'success');
            }
            
            // Load souvenirs for the new spot
            await loadSouvenirs(spotId);
            document.getElementById('modalTitle').textContent = 'Edit Tourist Spot';
            await loadSpots();
            
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
    
    // Display both saved souvenirs and pending souvenirs
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
                    ${souvenir.description ? `<p class="souvenir-desc">${escapeHtml(souvenir.description)}</p>` : ''}
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

// Remove pending souvenir from the list
window.removePendingSouvenir = function(tempId) {
    console.log('Removing pending souvenir with tempId:', tempId);
    
    const index = pendingSouvenirs.findIndex(s => s.tempId === tempId);
    
    if (index !== -1) {
        pendingSouvenirs.splice(index, 1);
        renderSouvenirs();
        showNotification('Pending souvenir removed', 'success');
    } else {
        console.error('Could not find pending souvenir with tempId:', tempId);
        showNotification('Failed to remove souvenir', 'error');
    }
};

// Open souvenir modal
window.openSouvenirModal = function(souvenirId = null) {
    const modal = document.getElementById('souvenirModal');
    const form = document.getElementById('souvenirForm');
    const title = document.getElementById('souvenirModalTitle');
    
    form.reset();
    document.getElementById('souvenirId').value = '';
    souvenirImageDataUrl = null;
    souvenirImageFile = null;
    
    // Set the spot ID if available
    const spotId = document.getElementById('spotId')?.value;
    if (spotId && spotId !== '') {
        document.getElementById('souvenirSpotId').value = String(spotId);
    }
    
    document.getElementById('souvenirUploadBox').style.display = 'flex';
    document.getElementById('souvenirPreviewDiv').style.display = 'none';
    document.getElementById('souvenirPreviewImg').src = '';
    
    if (souvenirId) {
        // Check if it's from existing souvenirs
        const souvenir = souvenirs.find(s => s.id === souvenirId);
        if (!souvenir) {
            showNotification('Souvenir not found', 'error');
            return;
        }
        
        title.textContent = 'Edit Souvenir';
        document.getElementById('souvenirId').value = souvenir.id;
        document.getElementById('souvenirName').value = souvenir.name || '';
        document.getElementById('souvenirDescription').value = souvenir.description || '';
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

// Save souvenir - can save as pending if spot not saved yet
async function saveSouvenir() {
    const saveBtn = document.getElementById('souvenirSaveBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        const souvenirId = document.getElementById('souvenirId').value;
        const name = document.getElementById('souvenirName').value.trim();
        const description = document.getElementById('souvenirDescription').value.trim();
        const price = parseFloat(document.getElementById('souvenirPrice').value);

        if (!name) {
            showNotification('Please enter a souvenir name', 'error');
            return;
        }

        if (isNaN(price) || price < 0) {
            showNotification('Please enter a valid price (non-negative number)', 'error');
            return;
        }
        
        // Check if spot exists
        let spotId = document.getElementById('spotId')?.value;
        
        if (!spotId || spotId === '') {
            // Spot not saved yet - store as pending souvenir with unique tempId
            const tempId = 'pending_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const pendingSouvenir = {
                tempId: tempId,
                name: name,
                description: description,
                price: price,
                image_url: souvenirImageDataUrl || null,
                pending: true
            };
            
            console.log('Adding pending souvenir:', pendingSouvenir);
            
            pendingSouvenirs.push(pendingSouvenir);
            renderSouvenirs();
            
            // Reset form and close modal
            document.getElementById('souvenirName').value = '';
            document.getElementById('souvenirDescription').value = '';
            document.getElementById('souvenirPrice').value = '';
            souvenirImageDataUrl = null;
            document.getElementById('souvenirUploadBox').style.display = 'flex';
            document.getElementById('souvenirPreviewDiv').style.display = 'none';
            document.getElementById('souvenirPreviewImg').src = '';
            
            showNotification('Souvenir added to pending list. It will be saved when you save the tourist spot.', 'success');
            closeSouvenirModal();
            return;
        }
        
        // Spot exists - save directly to database
        spotId = String(spotId);
        
        const currentSouvenir = souvenirId ? souvenirs.find(s => s.id === souvenirId) : null;

        const souvenirData = {
            tourist_spot_id: spotId,
            name: name,
            description: description || null,
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

// Container-specific notification function
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

// ========== HELPERS ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return map[m] || m;
    });
}