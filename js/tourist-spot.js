// Tourist Spot - Separate Beaches & Landmarks sections

let allSpots = [];
let allSouvenirs = [];
let currentFilter = 'all';
let isLoading = true;

document.addEventListener('DOMContentLoaded', async function() {
    if (typeof supabase === 'undefined') {
        showNotification('Connection error. Please refresh the page.', 'error');
        return;
    }
    
    const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';
    
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Event delegation for tourist spot clicks (prevents stale listener issues)
    setupSpotCardDelegation();
    
    showSkeletonLoaders();
    setupNavigation();
    setupFilters();
    setupSearch();
    setupModals();
    await loadData();
});

function showSkeletonLoaders() {
    const beachesContainer = document.getElementById('beachesScroll');
    const landmarksContainer = document.getElementById('landmarkScroll');
    const souvenirGrid = document.getElementById('souvenirGrid');
    
    if (beachesContainer) beachesContainer.innerHTML = generateSkeletonCards(3);
    if (landmarksContainer) landmarksContainer.innerHTML = generateSkeletonCards(3);
    if (souvenirGrid) souvenirGrid.innerHTML = generateSkeletonProducts(4);
}

function generateSkeletonCards(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `<div class="skeleton-card"><div class="skeleton-image"></div><div class="skeleton-body"><div class="skeleton-title"></div><div class="skeleton-rating"></div><div class="skeleton-location"></div></div></div>`;
    }
    return html;
}

function generateSkeletonProducts(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `<div class="skeleton-product"><div class="skeleton-product-image"></div><div class="skeleton-product-title"></div><div class="skeleton-product-price"></div></div>`;
    }
    return html;
}

async function loadData() {
    try {
        const { data: spots, error: spotsError } = await window.supabaseClient
            .from('tourist_spots')
            .select('*')
            .eq('is_visible', true)
            .order('created_at', { ascending: false });
        
        if (spotsError) throw spotsError;
        allSpots = spots || [];
        
        const { data: souvenirs, error: souvenirsError } = await window.supabaseClient
            .from('souvenirs')
            .select('*, tourist_spots(*)')
            .eq('is_available', true)
            .order('created_at', { ascending: false });
        
        if (souvenirsError) throw souvenirsError;
        allSouvenirs = souvenirs || [];
        
        isLoading = false;
        renderAllViews();
        
    } catch (error) {
        console.error('Load error:', error);
        isLoading = false;
        showNotification('Unable to load data. Please check your connection.', 'error');
        renderAllViews();
    }
}

function renderAllViews(searchQuery = '') {
    if (currentFilter === 'all' || currentFilter === 'beaches') {
        const beachesSection = document.getElementById('beachesSection');
        if (beachesSection) beachesSection.style.display = 'block';
        renderBeaches(searchQuery);
    } else {
        const beachesSection = document.getElementById('beachesSection');
        if (beachesSection) beachesSection.style.display = 'none';
    }
    
    if (currentFilter === 'all' || currentFilter === 'landmarks') {
        const landmarkSection = document.getElementById('landmarkSection');
        if (landmarkSection) landmarkSection.style.display = 'block';
        renderLandmarks(searchQuery);
    } else {
        const landmarkSection = document.getElementById('landmarkSection');
        if (landmarkSection) landmarkSection.style.display = 'none';
    }
    
    if (currentFilter === 'all' || currentFilter === 'souvenirs') {
        const souvenirSection = document.getElementById('souvenirSection');
        if (souvenirSection) souvenirSection.style.display = 'block';
        renderSouvenirs(searchQuery);
    } else {
        const souvenirSection = document.getElementById('souvenirSection');
        if (souvenirSection) souvenirSection.style.display = 'none';
    }
}

function renderBeaches(searchQuery = '') {
    const container = document.getElementById('beachesScroll');
    if (!container) return;
    
    let beaches = allSpots.filter(spot => spot.category === 'Beach');
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        beaches = beaches.filter(spot => 
            spot.name.toLowerCase().includes(q) || 
            (spot.location && spot.location.toLowerCase().includes(q)) ||
            (spot.description && spot.description.toLowerCase().includes(q))
        );
    }
    
    if (beaches.length === 0) {
        container.innerHTML = `<div class="empty-card"><i class="fa-solid fa-water"></i><p>No beaches found</p></div>`;
        return;
    }
    
    container.innerHTML = beaches.map(spot => generateSpotCard(spot)).join('');
    // click handling uses event delegation
}

function renderLandmarks(searchQuery = '') {
    const container = document.getElementById('landmarkScroll');
    if (!container) return;
    
    let landmarks = allSpots.filter(spot => spot.category === 'Landmark');
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        landmarks = landmarks.filter(spot => 
            spot.name.toLowerCase().includes(q) || 
            (spot.location && spot.location.toLowerCase().includes(q)) ||
            (spot.description && spot.description.toLowerCase().includes(q))
        );
    }
    
    if (landmarks.length === 0) {
        container.innerHTML = `<div class="empty-card"><i class="fa-solid fa-landmark"></i><p>No landmarks found</p></div>`;
        return;
    }
    
    container.innerHTML = landmarks.map(spot => generateSpotCard(spot)).join('');
    // click handling uses event delegation
}

function generateSpotCard(spot) {
    const hasImage = spot.image_url && spot.image_url.trim() !== '';
    const rating = spot.rating ? parseFloat(spot.rating).toFixed(1) : '4.5';
    
    return `
        <div class="card" data-spot-id="${spot.id}">
            ${hasImage ? `<img src="${escapeHtml(spot.image_url)}" alt="${escapeHtml(spot.name)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%239ca3af%22%3E%3Cpath d=%22M4 4h16v16H4z%22/%3E%3C/svg%3E'">` : '<div class="no-image"><i class="fa-solid fa-image"></i></div>'}
            <div class="card-body">
                <h4>${escapeHtml(spot.name)} <span>⭐ ${rating}</span></h4>
                <p><i class="fa-solid fa-location-dot"></i> ${escapeHtml(spot.location || 'Corcuera, Romblon')}</p>
                <div class="drivers"><span><i class="fa-regular fa-eye"></i> View Details</span></div>
            </div>
        </div>
    `;
}

// click handling for spot cards is handled via event delegation
function attachCardClickEvents() {
    // Attach click events to souvenir products
    const products = document.querySelectorAll('.product');
    products.forEach(product => {
        product.removeEventListener('click', handleProductClick);
        product.addEventListener('click', handleProductClick);
    });
}

function handleCardClick(event) {
    // Deprecated: spot clicks are handled by event delegation.
    const card = event.currentTarget;
    const spotId = card && card.getAttribute ? card.getAttribute('data-spot-id') : null;
    if (spotId) viewSpotDetails(parseInt(spotId));
}

function handleProductClick(event) {
    const product = event.currentTarget;
    const souvenirId = product.getAttribute('data-souvenir-id');
    if (souvenirId) {
        viewSouvenirDetails(parseInt(souvenirId));
    }
}

function setupSpotCardDelegation() {
    const beachesContainer = document.getElementById('beachesScroll');
    const landmarkContainer = document.getElementById('landmarkScroll');

    const handler = (event) => {
        const card = event.target.closest('.card');
        if (!card) return;

        const spotId = card.getAttribute('data-spot-id');
        if (!spotId) return;

        // Keep as string (Supabase id might be UUID)
        viewSpotDetails(String(spotId));
    };

    if (beachesContainer) {
        beachesContainer.removeEventListener('click', handler);
        beachesContainer.addEventListener('click', handler);
    }

    if (landmarkContainer) {
        landmarkContainer.removeEventListener('click', handler);
        landmarkContainer.addEventListener('click', handler);
    }
}



function renderSouvenirs(searchQuery = '') {
    const grid = document.getElementById('souvenirGrid');
    if (!grid) return;
    
    let filtered = [...allSouvenirs];
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(s => 
            s.name.toLowerCase().includes(q) ||
            (s.description && s.description.toLowerCase().includes(q)) ||
            (s.tourist_spots?.name && s.tourist_spots.name.toLowerCase().includes(q))
        );
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-card" style="grid-column:1/-1"><i class="fa-solid fa-gift"></i><p>No souvenirs found</p></div>`;
        return;
    }
    
    grid.innerHTML = filtered.map(souvenir => {
        const hasImage = souvenir.image_url && souvenir.image_url.trim() !== '';
        const price = parseFloat(souvenir.price).toFixed(0);
        return `
            <div class="product" data-souvenir-id="${souvenir.id}">
                ${hasImage ? `<img src="${escapeHtml(souvenir.image_url)}" alt="${escapeHtml(souvenir.name)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%239ca3af%22%3E%3Cpath d=%22M4 4h16v16H4z%22/%3E%3C/svg%3E'">` : '<div class="no-image"><i class="fa-solid fa-bag-shopping"></i></div>'}
                <h4>${escapeHtml(souvenir.name)}</h4>
                <p>${escapeHtml(souvenir.tourist_spots?.name || 'Local Vendor')}</p>
                <div class="price">₱${price} <i class="fa-solid fa-cart-plus"></i></div>
            </div>
        `;
    }).join('');
    
    attachCardClickEvents();
}

function setupModals() {
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('spotModal').style.display = 'none';
            document.getElementById('souvenirModal').style.display = 'none';
            document.body.style.overflow = '';
        });
    });
    
    window.addEventListener('click', function(event) {
        const spotModal = document.getElementById('spotModal');
        const souvenirModal = document.getElementById('souvenirModal');
        if (event.target === spotModal) {
            spotModal.style.display = 'none';
            document.body.style.overflow = '';
        }
        if (event.target === souvenirModal) {
            souvenirModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
    
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            document.getElementById('spotModal').style.display = 'none';
            document.getElementById('souvenirModal').style.display = 'none';
            document.body.style.overflow = '';
        }
    });
}

async function viewSpotDetails(spotId) {
    const modal = document.getElementById('spotModal');
    const modalName = document.getElementById('modalSpotName');
    const modalImage = document.getElementById('modalSpotImage');
    const modalRating = document.querySelector('#modalSpotRating span');
    const modalLocation = document.querySelector('#modalSpotLocation span');
    const modalCategory = document.querySelector('#modalSpotCategory span');
    const modalDescription = document.querySelector('#modalSpotDescription span');

    // Try from already-loaded list first
    let spot = allSpots.find(s => String(s.id) === String(spotId));

    // Fallback: fetch from Supabase if not in allSpots yet
    if (!spot) {
        try {
            const { data, error } = await window.supabaseClient
                .from('tourist_spots')
                .select('*')
                .eq('id', spotId)
                .single();

            if (error || !data) throw error || new Error('No spot data');
            spot = data;
        } catch (err) {
            console.error('Spot fetch error:', err);
            showNotification('Spot not found', 'error');
            return;
        }
    }

    modalName.textContent = spot.name || 'Unnamed Spot';

    if (spot.image_url && spot.image_url.trim() !== '') {
        modalImage.src = spot.image_url;
        modalImage.alt = spot.name;
        modalImage.onerror = function() {
            this.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%239ca3af%22%3E%3Cpath d=%22M4 4h16v16H4z%22/%3E%3C/svg%3E';
        };
    } else {
        modalImage.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%239ca3af%22%3E%3Cpath d=%22M4 4h16v16H4z%22/%3E%3C/svg%3E';
        modalImage.alt = 'No image available';
    }

    const rating = spot.rating ? parseFloat(spot.rating).toFixed(1) : '4.5';
    modalRating.textContent = `${rating} / 5.0`;
    modalLocation.textContent = spot.location || 'Corcuera, Romblon';
    modalCategory.textContent = spot.category || 'Tourist Spot';
    modalDescription.textContent = spot.description || 'No description available.';

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function viewSouvenirDetails(souvenirId) {
    const souvenir = allSouvenirs.find(s => String(s.id) === String(souvenirId));

    if (!souvenir) {
        showNotification('Souvenir not found', 'error');
        return;
    }
    
    const modal = document.getElementById('souvenirModal');
    const modalName = document.getElementById('modalSouvenirName');
    const modalImage = document.getElementById('modalSouvenirImage');
    const modalPrice = document.querySelector('#modalSouvenirPrice span');
    const modalShop = document.querySelector('#modalSouvenirShop span');
    const modalDescription = document.querySelector('#modalSouvenirDescription span');
    const buyBtn = document.getElementById('buyNowBtn');
    
    modalName.textContent = souvenir.name || 'Unnamed Souvenir';
    
    if (souvenir.image_url && souvenir.image_url.trim() !== '') {
        modalImage.src = souvenir.image_url;
        modalImage.alt = souvenir.name;
        modalImage.onerror = function() {
            this.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%239ca3af%22%3E%3Cpath d=%22M4 4h16v16H4z%22/%3E%3C/svg%3E';
        };
    } else {
        modalImage.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%239ca3af%22%3E%3Cpath d=%22M4 4h16v16H4z%22/%3E%3C/svg%3E';
        modalImage.alt = 'No image available';
    }
    
    const price = souvenir.price ? parseFloat(souvenir.price).toFixed(2) : '0.00';
    modalPrice.textContent = `₱${price}`;
    modalShop.textContent = souvenir.tourist_spots?.name || 'Local Vendor';
    modalDescription.textContent = souvenir.description || 'No description available.';
    
    if (buyBtn) {
        const newBuyBtn = buyBtn.cloneNode(true);
        buyBtn.parentNode.replaceChild(newBuyBtn, buyBtn);
        newBuyBtn.addEventListener('click', function() {
            showNotification(`Inquiry sent for ${souvenir.name}`, 'success');
        });
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function setupFilters() {
    const pills = document.querySelectorAll('.pill');
    const searchInput = document.getElementById('searchInput');
    
    pills.forEach(pill => {
        pill.addEventListener('click', function() {
            pills.forEach(p => p.classList.remove('active'));
            this.classList.add('active');
            
            const filter = this.dataset.filter;
            currentFilter = filter;
            
            if (searchInput) searchInput.value = '';
            
            if (filter === 'all') {
                renderAllViews('');
            } else if (filter === 'beaches') {
                const beachesSection = document.getElementById('beachesSection');
                const landmarkSection = document.getElementById('landmarkSection');
                const souvenirSection = document.getElementById('souvenirSection');
                if (beachesSection) beachesSection.style.display = 'block';
                if (landmarkSection) landmarkSection.style.display = 'none';
                if (souvenirSection) souvenirSection.style.display = 'none';
                renderBeaches('');
            } else if (filter === 'landmarks') {
                const beachesSection = document.getElementById('beachesSection');
                const landmarkSection = document.getElementById('landmarkSection');
                const souvenirSection = document.getElementById('souvenirSection');
                if (beachesSection) beachesSection.style.display = 'none';
                if (landmarkSection) landmarkSection.style.display = 'block';
                if (souvenirSection) souvenirSection.style.display = 'none';
                renderLandmarks('');
            } else if (filter === 'souvenirs') {
                const beachesSection = document.getElementById('beachesSection');
                const landmarkSection = document.getElementById('landmarkSection');
                const souvenirSection = document.getElementById('souvenirSection');
                if (beachesSection) beachesSection.style.display = 'none';
                if (landmarkSection) landmarkSection.style.display = 'none';
                if (souvenirSection) souvenirSection.style.display = 'block';
                renderSouvenirs('');
            }
        });
    });
    
    const seeAllBtns = document.querySelectorAll('.see-all');
    seeAllBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            const section = this.dataset.section;
            if (section === 'beaches') {
                const beachCount = allSpots.filter(s => s.category === 'Beach').length;
                showNotification(`${beachCount} beaches in Corcuera`, 'info');
                document.getElementById('beachesSection').scrollIntoView({ behavior: 'smooth' });
            } else if (section === 'landmarks') {
                const landmarkCount = allSpots.filter(s => s.category === 'Landmark').length;
                showNotification(`${landmarkCount} landmarks to explore`, 'info');
                document.getElementById('landmarkSection').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        if (currentFilter === 'all') {
            renderAllViews(query);
        } else if (currentFilter === 'beaches') {
            renderBeaches(query);
        } else if (currentFilter === 'landmarks') {
            renderLandmarks(query);
        } else if (currentFilter === 'souvenirs') {
            renderSouvenirs(query);
        }
    });
}

function setupNavigation() {
    const backBtn = document.getElementById('backButton');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'resident-homepage.html';
        });
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    notification.innerHTML = `<i class="fas ${icon}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Make functions available globally for any inline handlers (though we now use event listeners)
window.viewSpotDetails = viewSpotDetails;
window.viewSouvenirDetails = viewSouvenirDetails;