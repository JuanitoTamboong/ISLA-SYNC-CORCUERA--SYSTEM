// Admin Tourist Spots Management Script

// Global state
let spots = [];
let currentFilter = 'all';
let currentEditingSpot = null;
let spotImageFile = null;
let souvenirImageFile = null;


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

    // Check admin session
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

    // Set Supabase client globally for this page
    window.supabaseClient = supabaseClient;

    // Load spots
    await loadSpots();

    // Setup filter tabs
    setupFilterTabs();

    // Setup form submissions
    setupForms();

    // Setup image uploads
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
        
        // Load souvenir counts for each spot
        for (let spot of spots) {
            const { count } = await window.supabaseClient
                .from('souvenirs')
                .select('*', { count: 'exact', head: true })
                .eq('tourist_spot_id', spot.id);
            spot.souvenirCount = count || 0;
        }
        
        renderSpots();
    } catch (error) {
        console.error('Load spots error:', error);
        showNotification('Failed to load tourist spots', 'error');
        document.getElementById('spotList').innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Failed to load tourist spots</p>
            </div>
        `;
    }
}

// Store souvenirs for each spot
let spotSouvenirs = {};

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

    // Load souvenirs for all spots first
    for (let spot of filteredSpots) {
        try {
            const { data, error } = await window.supabaseClient
                .from('souvenirs')
                .select('*')
                .eq('tourist_spot_id', String(spot.id));
            
            if (error) throw error;
            spotSouvenirs[spot.id] = data || [];
        } catch (err) {
            console.error('Error loading souvenirs for spot:', spot.id, err);
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
        
// Build souvenirs HTML for inline display
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
    
// Reset form
    form.reset();
    document.getElementById('spotId').value = '';
    spotImageDataUrl = null;
    spotImageFile = null;
    
    // Reset image preview
    document.getElementById('spotUploadBox').style.display = 'flex';
    document.getElementById('spotPreviewDiv').style.display = 'none';
    document.getElementById('spotPreviewImg').src = '';
    
if (spotId) {
        // Edit mode
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
        
        // Show image if exists
        if (spot.image_url) {
            document.getElementById('spotUploadBox').style.display = 'none';
            document.getElementById('spotPreviewDiv').style.display = 'block';
            document.getElementById('spotPreviewImg').src = spot.image_url;
        }
        
        // Show souvenirs section (for existing spot, load souvenirs)
        souvenirSection.style.display = 'block';
        loadSouvenirs(spotId);
    } else {
        // Create mode - show empty souvenirs section
        currentEditingSpot = null;
        title.textContent = 'Add Tourist Spot';
        // Show souvenirs section even when creating new spot
        souvenirSection.style.display = 'block';
        // Clear the souvenirs grid for new spot
        souvenirs = [];
        renderSouvenirs();
    }
    
    modal.classList.add('show');
};

window.closeSpotModal = function() {
    document.getElementById('spotModal').classList.remove('show');
    currentEditingSpot = null;
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
    // Spot form
    document.getElementById('spotForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveSpot();
    });

    // Souvenir form
    document.getElementById('souvenirForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveSouvenir();
    });
}

// ========== IMAGE UPLOADS ==========
// Store the data URL instead of File object for direct database storage
let spotImageDataUrl = null;
let souvenirImageDataUrl = null;

function setupImageUploads() {
    // Spot image upload
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
        
        // Store as data URL for direct database storage (base64)
        const reader = new FileReader();
        reader.onload = function(e) {
            // Store the data URL, not the File object
            spotImageDataUrl = e.target.result;
            
            // Preview
            document.getElementById('spotPreviewImg').src = e.target.result;
            document.getElementById('spotUploadBox').style.display = 'none';
            document.getElementById('spotPreviewDiv').style.display = 'block';
        };
        reader.readAsDataURL(file);
    });

    // Souvenir image upload
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
        
        // Store as data URL for direct database storage (base64)
        const reader = new FileReader();
        reader.onload = function(e) {
            // Store the data URL, not the File object
            souvenirImageDataUrl = e.target.result;
            
            // Preview
            document.getElementById('souvenirPreviewImg').src = e.target.result;
            document.getElementById('souvenirUploadBox').style.display = 'none';
            document.getElementById('souvenirPreviewDiv').style.display = 'block';
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
        const description = document.getElementById('spotDescription').value.trim();
        const isVisible = document.getElementById('spotVisible').checked;

        if (!name) {
            showNotification('Please enter a spot name', 'error');
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
            return;
        }

        // Get the current spot data if editing (to preserve existing image)
        const currentSpot = spotId ? spots.find(s => s.id === spotId) : null;

const spotData = {
            name: name,
            category: category,
            location: location || null,
            description: description || null,
            is_visible: isVisible
        };

        // Use data URL (base64) for image storage
        if (spotImageDataUrl) {
            // New image uploaded - use the new image
            spotData.image_url = spotImageDataUrl;
        } else if (!spotImageDataUrl && currentSpot && currentSpot.image_url) {
            // No new image uploaded but there was an existing image - keep the old one
            spotData.image_url = currentSpot.image_url;
        }
        // If no new image and no existing image (new spot), don't include image_url

let isNewSpot = false;
        
        if (spotId) {
            // Update existing
            const { error } = await window.supabaseClient
                .from('tourist_spots')
                .update(spotData)
                .eq('id', spotId);

            if (error) throw error;
            showNotification('Tourist spot updated successfully', 'success');
            closeSpotModal();
        } else {
            // Create new
            const { data: newSpot, error } = await window.supabaseClient
                .from('tourist_spots')
                .insert([spotData])
                .select()
                .single();

            if (error) throw error;
            
            // Store the new spot ID for souvenirs
            spotId = newSpot.id;
            currentEditingSpot = newSpot;
            document.getElementById('spotId').value = spotId;
            isNewSpot = true;
            
            showNotification('Tourist spot created! You can now add souvenirs.', 'success');
            
            // Keep modal open and reload souvenirs for the new spot
            await loadSouvenirs(spotId);
            
            // Update modal title to show we're now editing
            document.getElementById('modalTitle').textContent = 'Edit Tourist Spot';
            
            // Don't close modal - let user add souvenirs
            // Also refresh the spot list in background
            await loadSpots();
            return; // Exit early - don't close modal
        }

        // Handle souvenirs for new spots (save them using the new spot ID)
        if (!document.getElementById('spotId').value && souvenirs.length > 0) {
            const newSpotId = spotId;
            // Reload souvenirs with the new spot ID
            await loadSouvenirs(newSpotId);
        }

        await loadSpots();

    } catch (error) {
        console.error('Save spot error:', error);
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
let deleteSpotId = null;

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
        // Delete souvenirs first (due to foreign key)
        const { error: souvenirError } = await window.supabaseClient
            .from('souvenirs')
            .delete()
            .eq('tourist_spot_id', deleteSpotId);

        if (souvenirError) throw souvenirError;

        // Delete the spot
        const { error } = await window.supabaseClient
            .from('tourist_spots')
            .delete()
            .eq('id', deleteSpotId);

        if (error) throw error;

        showNotification('Tourist spot deleted successfully', 'success');
        closeDeleteModal();
        await loadSpots();

    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Failed to delete tourist spot', 'error');
    } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
};

// ========== SOUVENIRS ==========
let souvenirs = [];

async function loadSouvenirs(spotId) {
    try {
        console.log('Loading souvenirs for spotId:', spotId, 'type:', typeof spotId);
        
        let allSouvenirs;
        
        // If we have a valid spotId, use Supabase query to filter directly
        if (spotId) {
            // Convert spotId to string for proper comparison
            const spotIdStr = String(spotId);
            console.log('Filtering by spotIdStr:', spotIdStr);
            
            // First, try fetching all souvenirs then filter locally (more reliable for UUIDs)
            const { data, error } = await window.supabaseClient
                .from('souvenirs')
                .select('*');

            if (error) {
                console.error('Error fetching souvenirs:', error);
                throw error;
            }
            
            // Filter locally by matching tourist_spot_id
            allSouvenirs = (data || []).filter(s => {
                const souvenirSpotId = String(s.tourist_spot_id);
                const targetId = spotIdStr;
                return souvenirSpotId === targetId || souvenirSpotId === spotId;
            });
        } else {
            // No spotId provided, get all souvenirs
            const { data, error } = await window.supabaseClient
                .from('souvenirs')
                .select('*');

            if (error) {
                console.error('Error fetching souvenirs:', error);
                throw error;
            }
            
            allSouvenirs = data || [];
        }
        
        console.log('Retrieved souvenirs:', allSouvenirs.length);
        souvenirs = allSouvenirs || [];
        
        console.log('Filtered souvenirs for spot', spotId, ':', souvenirs.length);
        renderSouvenirs();
    } catch (error) {
        console.error('Load souvenirs error:', error);
        souvenirs = [];
        renderSouvenirs();
    }
}

function renderSouvenirs() {
    const grid = document.getElementById('souvenirGrid');
    
    if (!grid) {
        console.error('Souvenir grid element not found');
        return;
    }
    
    console.log('Rendering souvenirs, count:', souvenirs.length);
    
    if (souvenirs.length === 0) {
        grid.innerHTML = `
            <div class="souvenir-empty">
                <i class="fa-solid fa-gift"></i>
                <p>No souvenirs yet</p>
                <p class="souvenir-hint">Click + Add to add souvenirs</p>
            </div>
        `;
        return;
    }

    // Render as a list with better visibility
    grid.innerHTML = souvenirs.map(souvenir => {
        const souvenirId = String(souvenir.id);
        const priceFormatted = parseFloat(souvenir.price).toFixed(0);
        
        return `
            <div class="souvenir-item" data-id="${souvenirId}">
                <div class="souvenir-image">
                    ${souvenir.image_url 
                        ? `<img src="${escapeHtml(souvenir.image_url)}" alt="${escapeHtml(souvenir.name)}" onerror="this.style.display='none';this.parentElement.innerHTML='<i class=\\'fa-solid fa-gift\\'></i>'">`
                        : `<i class="fa-solid fa-gift"></i>`
                    }
                </div>
                <div class="souvenir-details">
                    <p class="souvenir-name">${escapeHtml(souvenir.name)}</p>
                    ${souvenir.description ? `<p class="souvenir-desc">${escapeHtml(souvenir.description)}</p>` : ''}
                    <p class="souvenir-price">₱${priceFormatted}</p>
                </div>
                <div class="souvenir-actions">
                    <button onclick="editSouvenir('${souvenirId}')" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button onclick="deleteSouvenir('${souvenirId}')" title="Delete">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    console.log('Souvenirs rendered:', souvenirs.length, 'items');
}

window.openSouvenirModal = function(souvenirId = null) {
    const modal = document.getElementById('souvenirModal');
    const form = document.getElementById('souvenirForm');
    const title = document.getElementById('souvenirModalTitle');
    
// Reset form
    form.reset();
    document.getElementById('souvenirId').value = '';
    document.getElementById('souvenirSpotId').value = currentEditingSpot?.id || '';
    souvenirImageDataUrl = null;
    souvenirImageFile = null;
    
    // Reset preview
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

async function saveSouvenir() {
    const saveBtn = document.getElementById('souvenirSaveBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        const souvenirId = document.getElementById('souvenirId').value;
        const spotId = document.getElementById('souvenirSpotId').value;
        const name = document.getElementById('souvenirName').value.trim();
        const description = document.getElementById('souvenirDescription').value.trim();
        const price = parseFloat(document.getElementById('souvenirPrice').value);

        if (!spotId) {
            showNotification('No tourist spot selected', 'error');
            return;
        }

        if (!name) {
            showNotification('Please enter a souvenir name', 'error');
            return;
        }

        if (isNaN(price) || price < 0) {
            showNotification('Please enter a valid price', 'error');
            return;
        }

// Get the current souvenir data if editing (to preserve existing image)
        const currentSouvenir = souvenirId ? souvenirs.find(s => s.id === souvenirId) : null;

        const souvenirData = {
            tourist_spot_id: spotId,
            name: name,
            description: description || null,
            price: price,
            is_available: true
        };

        // Use data URL (base64) for image storage
        if (souvenirImageDataUrl) {
            // New image uploaded - use the new image
            souvenirData.image_url = souvenirImageDataUrl;
        } else if (!souvenirImageDataUrl && currentSouvenir && currentSouvenir.image_url) {
            // No new image uploaded but there was an existing image - keep the old one
            souvenirData.image_url = currentSouvenir.image_url;
        }
        // If no new image and no existing image (new souvenir), don't include image_url

        if (souvenirId) {
            // Update
            const { error } = await window.supabaseClient
                .from('souvenirs')
                .update(souvenirData)
                .eq('id', souvenirId);

            if (error) throw error;
            showNotification('Souvenir updated successfully', 'success');
        } else {
            // Create
            const { error } = await window.supabaseClient
                .from('souvenirs')
                .insert([souvenirData]);

            if (error) throw error;
            showNotification('Souvenir added successfully', 'success');
        }

        closeSouvenirModal();
        await loadSouvenirs(spotId);

    } catch (error) {
        console.error('Save souvenir error:', error);
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
        console.error('Delete souvenir error:', error);
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
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        if (notification && notification.parentNode) notification.remove();
    }, 4000);
}

// ========== HELPERS ==========
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        const map = {
            '&': '&amp;',
            '<': '<',
            '>': '>',
            '"': '"',
            "'": '&#039;'
        };
        return map[m] || m;
    });
}

function getTimeAgo(dateString) {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
