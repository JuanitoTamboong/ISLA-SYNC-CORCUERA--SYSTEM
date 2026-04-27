const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';

let supabaseClient = null;
let currentUser = null;
let allReports = [];
let activeFilter = 'all';

const CATEGORY_GROUPS = [
    { 
        key: 'infrastructure', 
        title: 'INFRASTRUCTURE', 
        subtitle: 'Streetlights, transport, energy, water, seaports',
        icon: 'fa-solid fa-road',
        keywords: ['streetlight', 'water', 'energy', 'seaport', 'transport', 'power outage', 'low water pressure', 'street light']
    },
    { 
        key: 'public_safety', 
        title: 'PUBLIC SAFETY', 
        subtitle: 'Emergency, Disaster, Safety Concerns',
        icon: 'fa-solid fa-shield-halved',
        keywords: ['safety', 'emergency', 'disaster', 'open manhole', 'danger', 'crime', 'hazard']
    },
    { 
        key: 'engineering', 
        title: 'ENGINEERING', 
        subtitle: 'Pavement, potholes, manholes, wires',
        icon: 'fa-solid fa-helmet-safety',
        keywords: ['pothole', 'pavement', 'manhole', 'wires', 'hanging wire', 'crack', 'sidewalk']
    },
    { 
        key: 'traffic', 
        title: 'TRAFFIC', 
        subtitle: 'Illegal Parking, Congestion, Violations',
        icon: 'fa-solid fa-traffic-light',
        keywords: ['traffic', 'illegal parking', 'commute', 'truck ban', 'violation', 'congestion']
    }
];

function detectCategory(report) {
    if (report.category && typeof report.category === 'string') {
        const catLower = report.category.toLowerCase();
        for (let group of CATEGORY_GROUPS) {
            if (catLower.includes(group.key) || group.title.toLowerCase().includes(catLower)) {
                return group.key;
            }
        }
    }
    
    const searchText = `${report.description || ''} ${report.reference || ''} ${report.location || ''} ${report.report_type || ''}`.toLowerCase();
    
    for (let group of CATEGORY_GROUPS) {
        for (let kw of group.keywords) {
            if (searchText.includes(kw.toLowerCase())) {
                return group.key;
            }
        }
    }
    
    return 'infrastructure';
}

function formatStatusClass(status) {
    if (!status) return 'status-pending';
    const st = status.toLowerCase();
    if (st === 'resolved') return 'status-resolved';
    if (st === 'in_review' || st === 'in-review') return 'status-in_review';
    return 'status-pending';
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"]/g, function(m) {
        const map = { '&': '&amp;', '<': '<', '>': '>', '"': '"' };
        return map[m];
    });
}

function renderReportItem(report) {
    const title = report.reference || report.title || 'Report';
    const description = report.description || 'No description';
    const shortDesc = description.length > 70 ? description.substring(0, 70) + '...' : description;
    const createdDate = report.created_at ? new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown date';
    const statusClass = formatStatusClass(report.status);
    const displayStatus = report.status ? report.status.toUpperCase().replace('_', ' ') : 'PENDING';
    const locationText = report.location_address || report.location || '';
    
    return `
        <div class="report-item" data-id="${report.id}">
            <div class="report-info">
                <div class="report-title">
                    <span>${escapeHtml(title)}</span>
                    <span class="report-status ${statusClass}">${displayStatus}</span>
                </div>
                <div class="report-desc">
                    <span>${escapeHtml(shortDesc)}</span>
                </div>
                <div class="report-date">
                    <i class="fa-regular fa-calendar-alt"></i> ${createdDate}
                </div>
                ${locationText ? `<div class="report-location"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(locationText.substring(0, 60))}</div>` : ''}
            </div>
            <div class="report-action">
                <i class="fa-regular fa-eye"></i> View
            </div>
        </div>
    `;
}

function renderCategorizedReports() {
    const container = document.getElementById('categoriesContainer');
    const loadingDiv = document.getElementById('loadingState');
    const emptyDiv = document.getElementById('emptyState');
    
    if (!allReports.length) {
        container.style.display = 'none';
        loadingDiv.style.display = 'none';
        emptyDiv.style.display = 'flex';
        emptyDiv.style.flexDirection = 'column';
        emptyDiv.style.alignItems = 'center';
        return;
    }
    
    container.style.display = 'flex';
    emptyDiv.style.display = 'none';
    
    let filteredReports = [...allReports];
    if (activeFilter === 'pending') {
        filteredReports = filteredReports.filter(r => r.status !== 'resolved');
    } else if (activeFilter === 'resolved') {
        filteredReports = filteredReports.filter(r => r.status === 'resolved');
    }
    
    if (filteredReports.length === 0) {
        container.innerHTML = `<div class="empty-state" style="display:flex; background:#fff; border-radius:28px; padding:40px; text-align:center; flex-direction:column; align-items:center;">
            <i class="fa-regular fa-file-lines"></i>
            <p>No ${activeFilter === 'pending' ? 'pending' : 'resolved'} reports found.</p>
        </div>`;
        return;
    }
    
    const grouped = {};
    CATEGORY_GROUPS.forEach(g => { grouped[g.key] = []; });
    
    filteredReports.forEach(report => {
        const cat = detectCategory(report);
        grouped[cat] ? grouped[cat].push(report) : grouped['infrastructure'].push(report);
    });
    
    let html = '';
    for (let group of CATEGORY_GROUPS) {
        const reportsList = grouped[group.key];
        if (!reportsList || reportsList.length === 0) continue;
        
        html += `
            <div class="category-section" data-category="${group.key}">
                <div class="category-header">
                    <i class="${group.icon} category-icon"></i>
                    <div>
                        <span class="category-title">${group.title}</span>
                        <span class="category-sub">${group.subtitle}</span>
                    </div>
                    <span style="margin-left:auto; background:#eef2ff; padding:4px 12px; border-radius:30px; font-size:0.7rem; font-weight:600;">${reportsList.length}</span>
                </div>
                <div class="reports-list">
                    ${reportsList.map(report => renderReportItem(report)).join('')}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

async function fetchUserReports(userId) {
    const { data, error } = await supabaseClient
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error) return [];
    return data || [];
}

async function fetchReportDetail(reportId) {
    const { data, error } = await supabaseClient
        .from('reports')
        .select('*')
        .eq('id', reportId)
        .single();
    
    if (error || !data) {
        console.error('Error fetching report:', error);
        return null;
    }
    return data;
}

function populateModal(report) {
    document.getElementById('modalTitle').textContent = 'Report Details';
    
    const reference = report.reference || 'N/A';
    document.getElementById('modalReferenceTitle').textContent = reference;
    
    const status = report.status ? report.status.toUpperCase().replace('_', ' ') : 'PENDING';
    document.getElementById('modalBadge').textContent = status;
    
    const dateStr = report.created_at ? new Date(report.created_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'Unknown';
    document.getElementById('modalDateTime').textContent = `Submitted on ${dateStr}`;
    
    // Category
    const category = report.category || detectCategory(report);
    const categoryTitle = category.toString().toUpperCase().replace(/_/g, ' ');
    document.getElementById('modalCategory').textContent = categoryTitle;
    
    // Location
    const location = report.location_address || report.location || 'Not specified';
    document.getElementById('modalLocationText').textContent = location.length > 25 ? location.substring(0, 25) + '...' : location;
    
    // Description
    document.getElementById('modalDescription').textContent = report.description || 'No description provided.';
    
    // Timeline time
    const timelineTime = report.created_at ? new Date(report.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'Recently';
    document.getElementById('modalTimelineTime').textContent = timelineTime;
    
    // Image
    const imgSection = document.getElementById('modalImageSection');
    const imgEl = document.getElementById('modalImage');
    const imgName = document.getElementById('modalImageName');
    if (report.image_url && report.image_url.startsWith('data:')) {
        imgEl.src = report.image_url;
        imgName.textContent = 'UPLOADED IMAGE: REPORT_IMAGE.JPG';
        imgSection.style.display = 'block';
    } else {
        imgSection.style.display = 'none';
    }
}

function showModal() {
    const modal = document.getElementById('reportModal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    modal.classList.add('show');
}

function hideModal() {
    const modal = document.getElementById('reportModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    modal.classList.remove('show');
}

async function initPage() {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
        window.location.href = '../pages/login.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(currentUserStr);
        if (!currentUser.id) {
            localStorage.removeItem('currentUser');
            window.location.href = '../pages/login.html';
            return;
        }
    } catch(e) {
        window.location.href = '../pages/login.html';
        return;
    }
    
    document.getElementById('loadingState').style.display = 'flex';
    
    allReports = await fetchUserReports(currentUser.id);
    document.getElementById('loadingState').style.display = 'none';
    
    renderCategorizedReports();
    
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeFilter = tab.dataset.filter;
            renderCategorizedReports();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initPage();
    
    // Navigation buttons
    document.getElementById('backBtn').onclick = () => window.history.back();
    document.getElementById('submitNewBtn').onclick = () => window.location.href = '../pages/report.html';
    document.getElementById('emptySubmitBtn').onclick = () => window.location.href = '../pages/report.html';
    
    // Modal controls
    document.getElementById('modalClose').onclick = hideModal;
    document.getElementById('modalOverlay').onclick = hideModal;
    
    // Report view click handler
    document.body.addEventListener('click', async (e) => {
        const reportItem = e.target.closest('.report-item');
        if (reportItem && reportItem.dataset.id && supabaseClient) {
            const reportId = reportItem.dataset.id;
            document.getElementById('loadingState').innerHTML = '<i class="fa-solid fa-spinner fa-pulse"></i> Loading details...';
            document.getElementById('loadingState').style.display = 'flex';
            
            const report = await fetchReportDetail(reportId);
            document.getElementById('loadingState').style.display = 'none';
            
            if (report) {
                populateModal(report);
                showModal();
            }
        }
    });
});

