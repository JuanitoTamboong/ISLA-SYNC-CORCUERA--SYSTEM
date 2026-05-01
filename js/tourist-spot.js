// Tourist Spot - Fetch data from database for residents

// Global state
let allSpots = [];
let allSouvenirs = [];
let currentCategory = 'Beach'; // Default filter: Beaches

document.addEventListener('DOMContentLoaded', async function() {
    if (typeof supabase === 'undefined') {
        showNotification('Error: Supabase SDK failed to load. Please refresh the page.', 'error');
        return;
    }
    
    const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';
    
    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Setup navigation
    setupNavigation();
    
    // Setup filter pills
    setupFilters();
    
    // Setup search
    setupSearch();
    
    // Load data from database
    await loadData();
});

async function loadData() {
    try {
        // Show loading state
        document.getElementById('landmarkScroll').innerHTML = '<div class="loading-placeholder">Loading spots...</div>';
        document.getElementById('souvenirGrid').innerHTML = '<div class="loading-placeholder">Loading souvenirs...</div>';
        
        // Fetch tourist spots (only visible ones)
        const { data: spots, error: spotsError } = await window.supabaseClient
            .from('tourist_spots')
            .select('*')
            .eq('is_visible', true)
            .order('created_at', { ascending: false });
        
        if (spotsError) throw spotsError;
        
        allSpots = spots || [];
        
        // Fetch souvenirs with their tourist spot info
        const { data: souvenirs, error: souvenirsError } = await window.supabaseClient
            .from('souvenirs')
            .select('*, tourist_spots(*)')
            .eq('is_available', true)
            .order('created_at', { ascending: false });
        
        if (souvenirsError) throw souvenirsError;
        
        allSouvenirs = souvenirs || [];
        
        // Render data
        renderSpots();
        renderSouvenirs();
        
    } catch (error) {
        console.error('Load data error:', error);
        showNotification('Failed to load tourist spots', 'error');
        
        // Show empty state on error
        document.getElementById('landmarkScroll').innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Failed to load spots</p>
            </div>
        `;
        document.getElementById('souvenirGrid').innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Failed to load souvenirs</p>
            </div>
        `;
    }
}

function setupNavigation() {
    const backBtn = document.querySelector('.header i.fa-arrow-left');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            window.location.href = 'resident-homepage.html';
        });
        // Make it clickable
        backBtn.style.cursor = 'pointer';
    }
}

function setupFilters() {
    const pills = document.querySelectorAll('.pill');
    pills.forEach(pill => {
        pill.addEventListener('click', function() {
            // Remove active from all
            pills.forEach(p => p.classList.remove('active'));
            // Add active to clicked
            this.classList.add('active');
            
            // Get category from pill text
            const text = this.textContent.trim();
            if (text.includes('Beach')) {
                currentCategory = 'Beach';
            } else if (text.includes('Landmark')) {
                currentCategory = 'Landmark';
            } else if (text.includes('Souvenir')) {
                currentCategory = 'Souvenir';
            }
            
            // Re-render spots
            renderSpots();
        });
    });
}

function setupSearch() {
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            
            if (currentCategory === 'Souvenir') {
                // Filter souvenirs by search
                renderSouvenirs(query);
            } else {
                // Filter spots by search
                renderSpots(query);
            }
        });
    }
}

function renderSpots(searchQuery = '') {
    const container = document.getElementById('landmarkScroll');
    
    if (!container) return;
    
    // Filter spots by category and search
    let filteredSpots = allSpots.filter(spot => {
        const matchesCategory = spot.category === currentCategory;
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch = 
                spot.name.toLowerCase().includes(query) ||
                (spot.description && spot.description.toLowerCase().includes(query)) ||
                (spot.location && spot.location.toLowerCase().includes(query));
            return matchesCategory && matchesSearch;
        }
        
        return matchesCategory;
    });
    
    if (filteredSpots.length === 0) {
        container.innerHTML = `
            <div class="empty-card">
                <i class="fa-solid fa-map-location-dot"></i>
                <p>No ${currentCategory.toLowerCase()} spots found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredSpots.map(spot => {
        const imageSrc = spot.image_url || '../assets/sea.jpg';
        
        return `
            <div class="card">
                <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(spot.name)}" 
                     onerror="this.src='../assets/sea.jpg'">
                <div class="card-body">
                    <h4>${escapeHtml(spot.name)} <span>⭐ ${getRating(spot)}</span></h4>
                    <p><i class="fa-solid fa-location-dot"></i> ${escapeHtml(spot.location || 'Corcuera')}</p>
                    <div class="drivers">
                        <span class="active">View Details</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderSouvenirs(searchQuery = '') {
    const grid = document.getElementById('souvenirGrid');
    
    if (!grid) return;
    
    // Get souvenirs
    let filteredSouvenirs = allSouvenirs;
    
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredSouvenirs = allSouvenirs.filter(s => {
            return s.name.toLowerCase().includes(query) ||
                (s.description && s.description.toLowerCase().includes(query));
        });
    }
    
    if (filteredSouvenirs.length === 0) {
        grid.innerHTML = `
            <div class="empty-card" style="grid-column: 1/-1; text-align: center; padding: 20px;">
                <i class="fa-solid fa-gift"></i>
                <p>No souvenirs found</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = filteredSouvenirs.map(souvenir => {
        const imageSrc = souvenir.image_url || '../assets/7.jpg';
        const price = parseFloat(souvenir.price).toFixed(0);
        
        return `
            <div class="product">
                <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(souvenir.name)}"
                     onerror="this.src='../assets/7.jpg'">
                <h4>${escapeHtml(souvenir.name)}</h4>
                <p>${escapeHtml(souvenir.tourist_spots?.name || 'Local Artisan')}</p>
                <div class="price">₱${price} <i class="fa-solid fa-cart-plus"></i></div>
            </div>
        `;
    }).join('');
}

function getRating(spot) {
    // For now, return a random rating between 4.0 and 5.0
    // In the future, you could add a ratings table
    return (4.0 + Math.random()).toFixed(1);
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
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: 'Poppins', sans-serif;
        max-width: 90%;
        word-break: break-word;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }, 4000);
}
