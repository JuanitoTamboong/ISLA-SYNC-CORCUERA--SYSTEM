// Admin Reports Map Script
const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';

// Simara Island coordinates
const SIMARA_COORDS = { lat: 12.8055, lon: 122.0474 };

let map;
let allReports = [];
let filteredReports = [];
let currentMarkers = [];
let activeFilter = 'all';
let currentReportId = null;
let supabaseClient = null;

// Custom marker icons
const MARKER_ICONS = {
    pending: L.divIcon({
        html: '<div style="background: linear-gradient(135deg, #f59e0b, #d97706); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(245,158,11,0.4); border: 2px solid white;"><i class="fa fa-exclamation" style="color:white; font-size: 14px;"></i></div>',
        iconSize: [32, 32],
        popupAnchor: [0, -16],
        className: 'custom-marker-pending'
    }),
    resolved: L.divIcon({
        html: '<div style="background: linear-gradient(135deg, #10b981, #059669); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(16,185,129,0.4); border: 2px solid white;"><i class="fa fa-check" style="color:white; font-size: 14px;"></i></div>',
        iconSize: [32, 32],
        popupAnchor: [0, -16],
        className: 'custom-marker-resolved'
    })
};

document.addEventListener('DOMContentLoaded', function() {
    if (typeof supabase === 'undefined') {
        showNotification('Error: Supabase SDK failed to load.', 'error');
        return;
    }

    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Check admin session
    const currentAdminStr = localStorage.getItem('currentAdmin');
    if (!currentAdminStr) {
        window.location.href = 'admin-login.html';
        return;
    }

    try {
        const admin = JSON.parse(currentAdminStr);
        if (!admin || !admin.id || admin.userType !== 'admin') {
            throw new Error('Invalid admin');
        }
    } catch (e) {
        localStorage.removeItem('currentAdmin');
        window.location.href = 'admin-login.html';
        return;
    }

    // Init map
    initMap();

    // Load data
    loadReports();

    // Filter tabs
    setupFilters();

    // Highlight report from homepage if any
    const highlightId = sessionStorage.getItem('highlightReportId');
    if (highlightId) {
        sessionStorage.removeItem('highlightReportId');
        setTimeout(() => highlightReport(highlightId), 800);
    }
});

function initMap() {
    if (typeof L === 'undefined') {
        showNotification('Map library failed to load.', 'error');
        return;
    }

    map = L.map('map', {
        zoomControl: true,
        fadeAnimation: true,
        zoomAnimation: true
    }).setView([SIMARA_COORDS.lat, SIMARA_COORDS.lon], 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
        minZoom: 3
    }).addTo(map);

    map.zoomControl.setPosition('bottomright');

    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);
}

async function loadReports() {
    try {
        const { data, error } = await supabaseClient
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allReports = data || [];
        applyFilter(activeFilter);

    } catch (error) {
        console.error('Load reports error:', error);
        showNotification('Failed to load reports', 'error');
        document.getElementById('reportsList').innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>Failed to load reports</p>
            </div>
        `;
    }
}

function applyFilter(filter) {
    activeFilter = filter;

    if (filter === 'all') {
        filteredReports = [...allReports];
    } else if (filter === 'pending') {
        filteredReports = allReports.filter(r => r.status !== 'resolved');
    } else if (filter === 'resolved') {
        filteredReports = allReports.filter(r => r.status === 'resolved');
    }

    renderMarkers();
    renderReportsList();
    updateCount();
}

function renderMarkers() {
    // Clear existing markers
    currentMarkers.forEach(m => map.removeLayer(m));
    currentMarkers = [];

    const reportsWithCoords = filteredReports.filter(r => r.latitude && r.longitude);

    reportsWithCoords.forEach(report => {
        const icon = report.status === 'resolved' ? MARKER_ICONS.resolved : MARKER_ICONS.pending;

        const marker = L.marker([report.latitude, report.longitude], { icon: icon })
            .bindPopup(`
                <div style="min-width: 180px;">
                    <strong>${escapeHtml(report.reference || 'Report')}</strong><br>
                    <span style="font-size: 12px; color: #666;">${escapeHtml(report.category || '')}</span><br>
                    <span style="font-size: 11px; color: #999;">${escapeHtml((report.location_address || report.location || '').substring(0, 50))}</span>
                </div>
            `)
            .on('click', () => openReportModal(report.id));

        marker.addTo(map);
        marker.reportId = report.id;
        currentMarkers.push(marker);
    });

    // Fit bounds if we have markers
    if (currentMarkers.length > 0) {
        const group = L.featureGroup(currentMarkers);
        map.fitBounds(group.getBounds().pad(0.1));
    } else {
        map.setView([SIMARA_COORDS.lat, SIMARA_COORDS.lon], 14);
    }
}

function renderReportsList() {
    const container = document.getElementById('reportsList');

    if (filteredReports.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-folder-open"></i>
                <p>No reports found</p>
            </div>
        `;
        return;
    }

    const html = filteredReports.map(report => {
        const statusClass = report.status === 'resolved' ? 'resolved' : 'pending';
        const statusText = report.status === 'resolved' ? 'Resolved' : 'Pending';
        const shortDesc = (report.description || '').length > 35
            ? report.description.substring(0, 35) + '...'
            : (report.description || 'No description');
        const dateStr = report.created_at
            ? new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '';

        return `
            <div class="report-item" data-id="${report.id}" onclick="openReportModal('${report.id}')">
                <div class="report-marker-icon ${statusClass}">
                    <i class="fa-solid ${statusClass === 'resolved' ? 'fa-check' : 'fa-exclamation'}"></i>
                </div>
                <div class="report-info">
                    <h4>${escapeHtml(report.reference || 'Report')}</h4>
                    <p>${escapeHtml(report.category || '')} &middot; ${escapeHtml(shortDesc)} &middot; ${dateStr}</p>
                </div>
                <span class="report-status-badge ${statusClass}">${statusText}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function updateCount() {
    const count = filteredReports.length;
    document.getElementById('reportCount').textContent = `${count} report${count !== 1 ? 's' : ''}`;
}

function setupFilters() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            applyFilter(tab.dataset.filter);
        });
    });
}

function openReportModal(reportId) {
    const report = allReports.find(r => r.id === reportId);
    if (!report) return;

    currentReportId = reportId;

    document.getElementById('modalTitle').textContent = report.reference || 'Report Details';
    document.getElementById('modalReference').textContent = report.reference || 'N/A';

    const statusEl = document.getElementById('modalStatus');
    const displayStatus = report.status === 'resolved' ? 'RESOLVED' : 'PENDING';
    statusEl.textContent = displayStatus;
    statusEl.className = `status-badge ${report.status === 'resolved' ? 'status-resolved' : 'status-pending'}`;

    document.getElementById('modalCategory').textContent = report.category || 'N/A';
    document.getElementById('modalDescription').textContent = report.description || 'No description provided.';

    const dateStr = report.created_at
        ? new Date(report.created_at).toLocaleString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
        : 'Unknown';
    document.getElementById('modalDate').textContent = dateStr;

    // Location
    const location = report.location_address || report.location || '';
    document.getElementById('modalLocation').textContent = location || 'N/A';

    const mapLink = document.getElementById('modalMapLink');
    if (report.latitude && report.longitude) {
        mapLink.href = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;
        mapLink.style.display = 'inline-flex';
    } else {
        mapLink.style.display = 'none';
    }

    // Image
    const imgSection = document.getElementById('modalImageSection');
    const imgEl = document.getElementById('modalImage');
    if (report.image_url && report.image_url.startsWith('data:')) {
        imgEl.src = report.image_url;
        imgSection.style.display = 'block';
    } else {
        imgSection.style.display = 'none';
    }

    // Show/hide action buttons based on current status
    const resolveBtn = document.getElementById('resolveBtn');
    const pendingBtn = document.getElementById('pendingBtn');
    if (report.status === 'resolved') {
        resolveBtn.style.display = 'none';
        pendingBtn.style.display = 'flex';
    } else {
        resolveBtn.style.display = 'flex';
        pendingBtn.style.display = 'none';
    }

    // Show modal
    document.getElementById('reportModal').classList.add('show');
    document.body.style.overflow = 'hidden';

    // Highlight the list item
    document.querySelectorAll('.report-item').forEach(item => item.classList.remove('highlighted'));
    const listItem = document.querySelector(`.report-item[data-id="${reportId}"]`);
    if (listItem) {
        listItem.classList.add('highlighted');
        listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Pan map to marker
    const marker = currentMarkers.find(m => m.reportId === reportId);
    if (marker && report.latitude && report.longitude) {
        map.setView([report.latitude, report.longitude], 16);
        marker.openPopup();
    }
}

function closeModal() {
    document.getElementById('reportModal').classList.remove('show');
    document.body.style.overflow = 'auto';
    currentReportId = null;
    document.querySelectorAll('.report-item').forEach(item => item.classList.remove('highlighted'));
}

async function updateReportStatus(newStatus) {
    if (!currentReportId || !supabaseClient) return;

    const btn = newStatus === 'resolved' ? document.getElementById('resolveBtn') : document.getElementById('pendingBtn');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';
    btn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('reports')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', currentReportId);

        if (error) throw error;

        // Update local data
        const report = allReports.find(r => r.id === currentReportId);
        if (report) {
            report.status = newStatus;
        }

        showNotification(`Report marked as ${newStatus}`, 'success');
        closeModal();
        applyFilter(activeFilter);

    } catch (error) {
        console.error('Update status error:', error);
        showNotification('Failed to update status', 'error');
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

function highlightReport(reportId) {
    const report = allReports.find(r => r.id === reportId);
    if (!report) return;

    // Switch to appropriate filter
    const targetFilter = report.status === 'resolved' ? 'resolved' : 'pending';
    if (activeFilter !== 'all' && activeFilter !== targetFilter) {
        document.querySelectorAll('.filter-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.filter === 'all');
        });
        applyFilter('all');
    }

    setTimeout(() => openReportModal(reportId), 300);
}

function refreshData() {
    const icon = document.querySelector('.header .refresh');
    icon.style.animation = 'spin 0.6s linear';
    setTimeout(() => icon.style.animation = '', 600);
    loadReports();
    showNotification('Refreshing data...', 'info');
}

// Navigation
window.navigateTo = function(page) {
    switch(page) {
        case 'home': window.location.href = 'admin-homepage.html'; break;
        case 'map': break;
        case 'news': window.location.href = 'admin-news.html'; break;
        case 'profile': window.location.href = 'admin-profile.html'; break;
    }
};

window.goBack = function() {
    window.location.href = 'admin-homepage.html';
};

window.openReportModal = openReportModal;
window.closeModal = closeModal;
window.updateReportStatus = updateReportStatus;

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"]/g, function(m) {
        const map = { '&': '&amp;', '<': '<', '>': '>', '"': '"' };
        return map[m];
    });
}

function showNotification(message, type) {
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
        if (notification && notification.parentNode) notification.remove();
    }, 4000);
}

// Add spin animation
const spinStyle = document.createElement('style');
spinStyle.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(spinStyle);

