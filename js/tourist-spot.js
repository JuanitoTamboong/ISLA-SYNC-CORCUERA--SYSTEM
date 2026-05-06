// Tourist Spot - Separate Beaches & Landmarks sections

let allSpots = [];
let allSouvenirs = [];
let currentFilter = 'all'; // 'all', 'beaches', 'landmarks', 'souvenirs'
let isLoading = true;

document.addEventListener('DOMContentLoaded', async function() {
    if (typeof supabase === 'undefined') {
        showNotification('Supabase SDK failed to load', 'error');
        return;
    }
    
    const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';
    
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    showSkeletonLoaders();
    setupNavigation();
    setupFilters();
    setupSearch();
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
        loadMockData();
    }
}

function loadMockData() {
    allSpots = [
        { id: 1, name: 'Bonbon Beach', category: 'Beach', rating: 4.8, location: 'Corcuera North, Romblon', image_url: null, description: 'Powdery white sand and crystal waters' },
        { id: 2, name: 'Tugdan Beach', category: 'Beach', rating: 4.6, location: 'Corcuera South', image_url: null, description: 'Serene cove with sunset views' },
        { id: 3, name: 'White Sand Cove', category: 'Beach', rating: 4.7, location: 'Corcuera East', image_url: null, description: 'Pristine shoreline' },
        { id: 4, name: 'St. Vincent Church', category: 'Landmark', rating: 4.5, location: 'Corcuera Centro', image_url: null, description: 'Historic 1800s church' },
        { id: 5, name: 'Simara Lighthouse', category: 'Landmark', rating: 4.9, location: 'Corcuera East', image_url: null, description: 'Panoramic ocean view' },
        { id: 6, name: 'Old Spanish Bridge', category: 'Landmark', rating: 4.4, location: 'Corcuera West', image_url: null, description: 'Colonial era stone bridge' }
    ];
    
    allSouvenirs = [
        { id: 1, name: 'Handwoven Basket', price: 250, image_url: null, tourist_spots: { name: 'Local Artisan' }, description: 'Traditional weave' },
        { id: 2, name: 'Seashell Necklace', price: 150, image_url: null, tourist_spots: { name: 'Beach Souvenirs' }, description: 'Handmade shells' },
        { id: 3, name: 'Banana Chips', price: 80, image_url: null, tourist_spots: { name: 'Delights Store' }, description: 'Sweet & crispy' },
        { id: 4, name: 'Romblon Marble', price: 350, image_url: null, tourist_spots: { name: 'Craft Shop' }, description: 'Polished souvenir' }
    ];
    
    renderAllViews();
}

function renderAllViews(searchQuery = '') {
    // Always render beaches & landmarks separately (when filter is 'all' or specific)
    if (currentFilter === 'all' || currentFilter === 'beaches') {
        document.getElementById('beachesSection').style.display = 'block';
        renderBeaches(searchQuery);
    } else {
        document.getElementById('beachesSection').style.display = 'none';
    }
    
    if (currentFilter === 'all' || currentFilter === 'landmarks') {
        document.getElementById('landmarkSection').style.display = 'block';
        renderLandmarks(searchQuery);
    } else {
        document.getElementById('landmarkSection').style.display = 'none';
    }
    
    if (currentFilter === 'all' || currentFilter === 'souvenirs') {
        document.getElementById('souvenirSection').style.display = 'block';
        renderSouvenirs(searchQuery);
    } else {
        document.getElementById('souvenirSection').style.display = 'none';
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
            (spot.location && spot.location.toLowerCase().includes(q))
        );
    }
    
    if (beaches.length === 0) {
        container.innerHTML = `<div class="empty-card"><i class="fa-solid fa-water"></i><p>No beaches found</p></div>`;
        return;
    }
    
    container.innerHTML = beaches.map(spot => generateSpotCard(spot)).join('');
}

function renderLandmarks(searchQuery = '') {
    const container = document.getElementById('landmarkScroll');
    if (!container) return;
    
    let landmarks = allSpots.filter(spot => spot.category === 'Landmark');
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        landmarks = landmarks.filter(spot => 
            spot.name.toLowerCase().includes(q) || 
            (spot.location && spot.location.toLowerCase().includes(q))
        );
    }
    
    if (landmarks.length === 0) {
        container.innerHTML = `<div class="empty-card"><i class="fa-solid fa-landmark"></i><p>No landmarks found</p></div>`;
        return;
    }
    
    container.innerHTML = landmarks.map(spot => generateSpotCard(spot)).join('');
}

function generateSpotCard(spot) {
    const hasImage = spot.image_url && spot.image_url.trim() !== '';
    const rating = spot.rating || (4.0 + Math.random() * 1.0).toFixed(1);
    const displayRating = parseFloat(rating).toFixed(1);
    
    return `
        <div class="card" onclick="viewSpotDetails(${spot.id})">
            ${hasImage ? `<img src="${escapeHtml(spot.image_url)}" alt="${escapeHtml(spot.name)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%239ca3af%22%3E%3Cpath d=%22M4 4h16v16H4z%22/%3E%3C/svg%3E'">` : '<div class="no-image"><i class="fa-solid fa-image"></i></div>'}
            <div class="card-body">
                <h4>${escapeHtml(spot.name)} <span>⭐ ${displayRating}</span></h4>
                <p><i class="fa-solid fa-location-dot"></i> ${escapeHtml(spot.location || 'Corcuera, Romblon')}</p>
                <div class="drivers"><span><i class="fa-regular fa-eye"></i> View Details</span></div>
            </div>
        </div>
    `;
}

function renderSouvenirs(searchQuery = '') {
    const grid = document.getElementById('souvenirGrid');
    if (!grid) return;
    
    let filtered = [...allSouvenirs];
    
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(s => 
            s.name.toLowerCase().includes(q) ||
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
            <div class="product" onclick="viewSouvenirDetails(${souvenir.id})">
                ${hasImage ? `<img src="${escapeHtml(souvenir.image_url)}" alt="${escapeHtml(souvenir.name)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%239ca3af%22%3E%3Cpath d=%22M4 4h16v16H4z%22/%3E%3C/svg%3E'">` : '<div class="no-image"><i class="fa-solid fa-bag-shopping"></i></div>'}
                <h4>${escapeHtml(souvenir.name)}</h4>
                <p>${escapeHtml(souvenir.tourist_spots?.name || 'Local Artisan')}</p>
                <div class="price">₱${price} <i class="fa-solid fa-cart-plus"></i></div>
            </div>
        `;
    }).join('');
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
            
            // Clear search input when changing filters (optional)
            if (searchInput) searchInput.value = '';
            
            if (filter === 'all') {
                renderAllViews('');
            } else if (filter === 'beaches') {
                document.getElementById('beachesSection').style.display = 'block';
                document.getElementById('landmarkSection').style.display = 'none';
                document.getElementById('souvenirSection').style.display = 'none';
                renderBeaches('');
            } else if (filter === 'landmarks') {
                document.getElementById('beachesSection').style.display = 'none';
                document.getElementById('landmarkSection').style.display = 'block';
                document.getElementById('souvenirSection').style.display = 'none';
                renderLandmarks('');
            } else if (filter === 'souvenirs') {
                document.getElementById('beachesSection').style.display = 'none';
                document.getElementById('landmarkSection').style.display = 'none';
                document.getElementById('souvenirSection').style.display = 'block';
                renderSouvenirs('');
            }
        });
    });
    
    // "See all" functionality for each section
    const seeAllBtns = document.querySelectorAll('.see-all');
    seeAllBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            const section = this.dataset.section;
            if (section === 'beaches') {
                const beachCount = allSpots.filter(s => s.category === 'Beach').length;
                showNotification(`${beachCount} beautiful beaches in Corcuera`, 'info');
                // Scroll to beaches section
                document.getElementById('beachesSection').scrollIntoView({ behavior: 'smooth' });
            } else if (section === 'landmarks') {
                const landmarkCount = allSpots.filter(s => s.category === 'Landmark').length;
                showNotification(`${landmarkCount} historic landmarks to explore`, 'info');
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

window.viewSpotDetails = function(spotId) {
    const spot = allSpots.find(s => s.id === spotId);
    if (spot) showNotification(`📍 ${spot.name} - Tap for full details`, 'info');
};

window.viewSouvenirDetails = function(souvenirId) {
    const souvenir = allSouvenirs.find(s => s.id === souvenirId);
    if (souvenir) showNotification(`🛍️ ${souvenir.name} - ₱${souvenir.price}`, 'info');
};

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
    notification.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i><span>${escapeHtml(message)}</span>`;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}