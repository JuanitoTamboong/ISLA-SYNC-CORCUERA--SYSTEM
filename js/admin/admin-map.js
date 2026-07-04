// Admin Reports Map Script
const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';

const SIMARA_COORDS = { lat: 12.8055, lon: 122.0474 };

let map;
let allReports = [];
let filteredReports = [];
let currentMarkers = [];
let activeFilter = 'all';
let currentReportId = null;
let supabaseClient = null;
let userAvatars = {};
let currentAdmin = null;

const AVATAR_COLORS = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e', '#ef4444', '#f59e0b',
    '#10b981', '#06b6d4', '#3b82f6', '#4f46e5'
];

function getColorFromName(name) {
    if (!name) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function createMarkerIcon(report) {
    const isResolved = report.status === 'resolved';
    const color = isResolved ? '#10b981' : '#f59e0b';
    const reporterName = report.reporter_name || report.name || report.full_name || 'U';
    const avatarUrl = report.avatar_url || userAvatars[report.user_id]?.avatar_url;
    const initials = getInitials(reporterName);

    const html = avatarUrl ? `
        <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            overflow: hidden;
            transition: all 0.2s ease;
            cursor: pointer;
            position: relative;
        ">
            <img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;">
            <div style="
                position: absolute;
                bottom: -2px;
                right: -2px;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: ${color};
                border: 2px solid white;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            "></div>
        </div>
    ` : `
        <div style="
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: ${color};
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 14px;
            font-weight: 700;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border: 2px solid white;
            transition: all 0.2s ease;
            cursor: pointer;
            font-family: 'Poppins', sans-serif;
            position: relative;
        ">
            ${initials}
            <div style="
                position: absolute;
                bottom: -2px;
                right: -2px;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background: ${isResolved ? '#10b981' : '#f59e0b'};
                border: 2px solid white;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            "></div>
        </div>
    `;

    return L.divIcon({
        html: html,
        iconSize: [40, 40],
        popupAnchor: [0, -20],
        className: `custom-marker-${isResolved ? 'resolved' : 'pending'}`
    });
}

document.addEventListener('DOMContentLoaded', function() {
    if (typeof supabase === 'undefined') {
        showNotification('Error: Configuration failed to load.', 'error');
        return;
    }

    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const currentAdminStr = localStorage.getItem('currentAdmin');
    if (!currentAdminStr) {
        window.location.href = 'admin-login.html';
        return;
    }

    try {
        currentAdmin = JSON.parse(currentAdminStr);
        if (!currentAdmin || !currentAdmin.id || currentAdmin.userType !== 'admin') {
            throw new Error('Invalid admin');
        }
    } catch (e) {
        localStorage.removeItem('currentAdmin');
        window.location.href = 'admin-login.html';
        return;
    }

    initMap();
    loadReports();
    setupFilters();

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
            .from('reports_with_users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allReports = data || [];
        await loadUserAvatars();
        applyFilter(activeFilter);

    } catch (error) {
        showNotification('Failed to load reports', 'error');
        document.getElementById('reportsList').innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-circle-exclamation"></i>
                <p>Failed to load reports</p>
            </div>
        `;
    }
}

async function loadUserAvatars() {
    const userIds = allReports
        .map(r => r.user_id)
        .filter(id => id && !userAvatars[id]);
    
    if (userIds.length === 0) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('id, avatar_url, full_name')
            .in('id', userIds);
        
        if (!error && data) {
            data.forEach(profile => {
                userAvatars[profile.id] = profile;
            });
        }
    } catch (e) {}
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
    updateStats();
}

function renderMarkers() {
    currentMarkers.forEach(m => map.removeLayer(m));
    currentMarkers = [];

    const reportsWithCoords = filteredReports.filter(r => r.latitude && r.longitude);

    reportsWithCoords.forEach(report => {
        const icon = createMarkerIcon(report);
        const reporterName = report.reporter_name || report.name || report.full_name || 'Unknown';

        const marker = L.marker([report.latitude, report.longitude], { icon: icon })
            .bindPopup(`
                <div style="min-width: 200px; font-family: 'Poppins', sans-serif; padding: 4px 0;">
                    <strong style="font-size: 14px; color: #0f172a;">${escapeHtml(report.reference || 'Report')}</strong><br>
                    <span style="font-size: 12px; color: #475569;">${escapeHtml(reporterName)}</span><br>
                    <span style="font-size: 11px; color: #94a3b8;">${escapeHtml(report.category || '')}</span><br>
                    <span style="font-size: 11px; color: #94a3b8;">${escapeHtml((report.location_address || report.location || '').substring(0, 50))}</span>
                </div>
            `)
            .on('click', () => openReportModal(report.id));

        marker.addTo(map);
        marker.reportId = report.id;
        currentMarkers.push(marker);
    });

    document.getElementById('mapMarkerCount').textContent = `${currentMarkers.length} marker${currentMarkers.length !== 1 ? 's' : ''}`;

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
                <p style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Try changing the filter</p>
            </div>
        `;
        return;
    }

    const html = filteredReports.map(report => {
        const statusClass = report.status === 'resolved' ? 'resolved' : 'pending';
        const statusText = report.status === 'resolved' ? 'Resolved' : 'Pending';
        const shortDesc = (report.description || '').length > 40
            ? report.description.substring(0, 40) + '...'
            : (report.description || 'No description');
        
        const dateStr = report.created_at
            ? new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '';
        
        const timeStr = report.created_at
            ? new Date(report.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : '';

        const reporterName = report.reporter_name || report.name || report.full_name || 'Unknown';
        const initials = getInitials(reporterName);
        const color = getColorFromName(reporterName);
        const avatarUrl = report.avatar_url || userAvatars[report.user_id]?.avatar_url;
        
        const categoryClass = getCategoryClass(report.category);

        const avatarHtml = avatarUrl 
            ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(reporterName)}">`
            : initials;

        return `
            <div class="report-item" data-id="${report.id}" onclick="openReportModal('${report.id}')">
                <div class="report-avatar ${statusClass}-bg">
                    ${avatarHtml}
                    <span class="status-dot ${statusClass}"></span>
                </div>
                <div class="report-info">
                    <div class="report-name">
                        <h4>${escapeHtml(reporterName)}</h4>
                        <span class="report-ref">${escapeHtml(report.reference || 'N/A')}</span>
                        <span class="report-time">${dateStr} · ${timeStr}</span>
                    </div>
                    <div class="report-meta">
                        <span class="category-tag ${categoryClass}">${escapeHtml(report.category || '')}</span>
                        <span class="report-desc">${escapeHtml(shortDesc)}</span>
                    </div>
                </div>
                <span class="report-status-badge ${statusClass}">${statusText}</span>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function getCategoryClass(category) {
    if (!category) return '';
    const map = {
        'INFRASTRUCTURE': 'infrastructure',
        'PUBLIC SAFETY': 'safety',
        'ENGINEERING': 'engineering',
        'TRAFFIC VIOLATION': 'traffic'
    };
    return map[category] || '';
}

function updateStats() {
    const total = filteredReports.length;
    const pending = filteredReports.filter(r => r.status !== 'resolved').length;
    const resolved = filteredReports.filter(r => r.status === 'resolved').length;

    document.getElementById('totalReports').textContent = total;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('resolvedCount').textContent = resolved;
    document.getElementById('reportCount').textContent = total;
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

// ============================================
// COMMENTS FUNCTIONS
// ============================================

async function fetchComments(reportId) {
    try {
        const { data, error } = await supabaseClient
            .from('report_comments')
            .select('*')
            .eq('report_id', reportId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        if (!data || data.length === 0) return [];
        
        // Fetch user profiles separately
        const userIds = data.map(c => c.user_id).filter(id => id);
        let profilesMap = {};
        
        if (userIds.length > 0) {
            const { data: profiles, error: profilesError } = await supabaseClient
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', userIds);
            
            if (!profilesError && profiles) {
                profilesMap = Object.fromEntries(
                    profiles.map(p => [p.id, p])
                );
            }
        }
        
        return data.map(comment => ({
            ...comment,
            profiles: profilesMap[comment.user_id] || null
        }));
        
    } catch (error) {
        return [];
    }
}

async function addAdminComment(reportId, comment) {
    try {
        const { data, error } = await supabaseClient
            .from('report_comments')
            .insert([{
                report_id: reportId,
                user_id: currentAdmin.id,
                comment: comment,
                is_admin: true
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        if (data) {
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', data.user_id)
                .single();
            
            return {
                ...data,
                profiles: profile || null
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

// ============================================
// DELETE COMMENT - ADMIN
// ============================================

async function deleteAdminComment(commentId) {
    try {
        // Verify comment exists
        const { data: comment, error: fetchError } = await supabaseClient
            .from('report_comments')
            .select('id')
            .eq('id', commentId)
            .single();
        
        if (fetchError) {
            showNotification('Comment not found.', 'error');
            return false;
        }
        
        // Delete the comment
        const { error: deleteError } = await supabaseClient
            .from('report_comments')
            .delete()
            .eq('id', commentId);
        
        if (deleteError) {
            showNotification('Failed to delete comment.', 'error');
            return false;
        }
        
        return true;
    } catch (error) {
        showNotification('An error occurred while deleting.', 'error');
        return false;
    }
}

window.handleAdminDeleteComment = async function(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    const success = await deleteAdminComment(commentId);
    
    if (success) {
        showNotification('Comment deleted successfully!', 'success');
        if (currentReportId) {
            const comments = await fetchComments(currentReportId);
            renderComments(comments);
        }
    }
};

function renderComments(comments) {
    const container = document.getElementById('modalCommentsContainer');
    
    if (!container) return;
    
    if (!comments || comments.length === 0) {
        container.innerHTML = `
            <div class="no-comments">
                <i class="fa-regular fa-comment"></i>
                <p>No comments yet</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    comments.forEach(comment => {
        const isAdmin = comment.is_admin || false;
        const userName = comment.profiles?.full_name || (isAdmin ? 'Admin' : 'User');
        const initials = getInitials(userName);
        const avatarUrl = comment.profiles?.avatar_url || null;
        const timeAgo = getTimeAgo(comment.created_at);
        
        const avatarHtml = avatarUrl 
            ? `<img src="${avatarUrl}" alt="${escapeHtml(userName)}">`
            : initials;
        
        // Admin can delete any comment
        const canDelete = true;
        
        html += `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-avatar ${isAdmin ? 'admin' : 'resident'}">
                    ${avatarHtml}
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${escapeHtml(userName)}</span>
                        ${isAdmin ? '<span class="comment-badge admin">Admin</span>' : '<span class="comment-badge resident">Resident</span>'}
                        <span class="comment-time">${timeAgo}</span>
                        ${canDelete ? `<button class="comment-delete-btn" onclick="handleAdminDeleteComment('${comment.id}')" title="Delete comment">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>` : ''}
                    </div>
                    <p class="comment-text">${escapeHtml(comment.comment)}</p>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
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
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================
// OPEN REPORT MODAL WITH COMMENTS
// ============================================

async function openReportModal(reportId) {
    const report = allReports.find(r => r.id === reportId);
    if (!report) return;

    currentReportId = reportId;

    const reporterName = report.reporter_name || report.name || report.full_name || 'Unknown';
    const initials = getInitials(reporterName);
    const color = getColorFromName(reporterName);
    const avatarUrl = report.avatar_url || userAvatars[report.user_id]?.avatar_url;

    // Set avatar
    const avatarEl = document.getElementById('modalAvatar');
    const avatarImg = document.getElementById('modalAvatarImg');
    const avatarInitials = document.getElementById('modalAvatarInitials');

    if (avatarUrl) {
        avatarImg.src = avatarUrl;
        avatarImg.style.display = 'block';
        avatarInitials.style.display = 'none';
        avatarEl.style.background = 'transparent';
        avatarEl.style.padding = '0';
    } else {
        avatarImg.style.display = 'none';
        avatarInitials.style.display = 'block';
        avatarInitials.textContent = initials;
        avatarEl.style.background = color;
        avatarEl.style.padding = '';
    }

    document.getElementById('modalTitle').textContent = report.reference || 'Report Details';
    document.getElementById('modalReporter').textContent = reporterName;
    document.getElementById('modalReference').textContent = report.reference || '#ISC-0000';

    const statusEl = document.getElementById('modalStatus');
    const displayStatus = report.status === 'resolved' ? 'RESOLVED' : 'PENDING';
    statusEl.textContent = displayStatus;
    statusEl.className = `status-badge ${report.status === 'resolved' ? 'status-resolved' : 'status-pending'}`;

    const categoryEl = document.getElementById('modalCategory');
    categoryEl.textContent = report.category || 'N/A';
    categoryEl.className = `category-badge`;

    document.getElementById('modalDescription').textContent = report.description || 'No description provided.';

    const dateStr = report.created_at
        ? new Date(report.created_at).toLocaleString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
        : 'Unknown';
    document.getElementById('modalDate').textContent = dateStr;

    const location = report.location_address || report.location || '';
    document.getElementById('modalLocation').textContent = location || 'No location provided';

    const mapLink = document.getElementById('modalMapLink');
    if (report.latitude && report.longitude) {
        mapLink.href = `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;
        mapLink.style.display = 'inline-flex';
    } else {
        mapLink.style.display = 'none';
    }

    const imgSection = document.getElementById('modalImageSection');
    const imgEl = document.getElementById('modalImage');
    const fullscreenImg = document.getElementById('fullscreenImage');
    if (report.image_url && report.image_url.startsWith('data:')) {
        imgEl.src = report.image_url;
        fullscreenImg.src = report.image_url;
        imgSection.style.display = 'block';
    } else {
        imgSection.style.display = 'none';
    }

    const resolveBtn = document.getElementById('resolveBtn');
    const pendingBtn = document.getElementById('pendingBtn');
    if (report.status === 'resolved') {
        resolveBtn.style.display = 'none';
        pendingBtn.style.display = 'flex';
    } else {
        resolveBtn.style.display = 'flex';
        pendingBtn.style.display = 'none';
    }

    // Load comments
    const comments = await fetchComments(reportId);
    renderComments(comments);

    // Show modal
    document.getElementById('reportModal').classList.add('show');
    document.body.style.overflow = 'hidden';

    document.querySelectorAll('.report-item').forEach(item => item.classList.remove('highlighted'));
    const listItem = document.querySelector(`.report-item[data-id="${reportId}"]`);
    if (listItem) {
        listItem.classList.add('highlighted');
        listItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const marker = currentMarkers.find(m => m.reportId === reportId);
    if (marker && report.latitude && report.longitude) {
        map.setView([report.latitude, report.longitude], 16);
        marker.openPopup();
    }
}

// ============================================
// SUBMIT ADMIN COMMENT
// ============================================

async function submitAdminComment() {
    const input = document.getElementById('adminCommentInput');
    const comment = input.value.trim();
    
    if (!comment || !currentReportId) return;
    
    const btn = document.getElementById('submitAdminCommentBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    
    const newComment = await addAdminComment(currentReportId, comment);
    
    if (newComment) {
        input.value = '';
        const comments = await fetchComments(currentReportId);
        renderComments(comments);
        showNotification('Comment added successfully!', 'success');
    } else {
        showNotification('Failed to add comment. Please try again.', 'error');
    }
    
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-regular fa-paper-plane"></i> Send';
}

// ============================================
// CLOSE MODAL
// ============================================

function closeModal() {
    document.getElementById('reportModal').classList.remove('show');
    document.body.style.overflow = 'auto';
    currentReportId = null;
    document.querySelectorAll('.report-item').forEach(item => item.classList.remove('highlighted'));
}

// ============================================
// IMAGE FULLSCREEN
// ============================================

function openImageFullscreen() {
    document.getElementById('imageFullscreenModal').classList.add('show');
    document.getElementById('imageFullscreenModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeImageFullscreen() {
    document.getElementById('imageFullscreenModal').classList.remove('show');
    document.getElementById('imageFullscreenModal').style.display = 'none';
    document.body.style.overflow = '';
}

// ============================================
// UPDATE REPORT STATUS
// ============================================

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

        const report = allReports.find(r => r.id === currentReportId);
        if (report) {
            report.status = newStatus;
        }

        showNotification(`Report marked as ${newStatus}`, 'success');
        closeModal();
        applyFilter(activeFilter);

    } catch (error) {
        showNotification('Failed to update status', 'error');
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

// ============================================
// HIGHLIGHT REPORT
// ============================================

function highlightReport(reportId) {
    const report = allReports.find(r => r.id === reportId);
    if (!report) return;

    const targetFilter = report.status === 'resolved' ? 'resolved' : 'pending';
    if (activeFilter !== 'all' && activeFilter !== targetFilter) {
        document.querySelectorAll('.filter-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.filter === 'all');
        });
        applyFilter('all');
    }

    setTimeout(() => openReportModal(reportId), 300);
}

// ============================================
// REFRESH DATA
// ============================================

function refreshData() {
    const icon = document.querySelector('.header .refresh-btn i');
    if (icon) {
        icon.style.animation = 'spin 0.6s linear';
        setTimeout(() => {
            if (icon) icon.style.animation = '';
        }, 600);
    }
    loadReports();
    showNotification('Refreshing data...', 'info');
}

// ============================================
// NAVIGATION
// ============================================

window.goBack = function() {
    window.location.href = 'admin-homepage.html';
};

// ============================================
// EXPOSE FUNCTIONS TO GLOBAL
// ============================================

window.openReportModal = openReportModal;
window.closeModal = closeModal;
window.updateReportStatus = updateReportStatus;
window.refreshData = refreshData;
window.goBack = goBack;
window.openImageFullscreen = openImageFullscreen;
window.closeImageFullscreen = closeImageFullscreen;
window.submitAdminComment = submitAdminComment;
window.handleAdminDeleteComment = handleAdminDeleteComment;

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"]/g, function(m) {
        const map = { '&': '&amp;', '<': '<', '>': '>', '"': '&quot;' };
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
        border-radius: 12px;
        font-size: 14px;
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        font-family: 'Poppins', sans-serif;
        max-width: 90%;
        word-break: break-word;
        animation: slideDown 0.3s ease-out;
    `;

    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification && notification.parentNode) notification.remove();
    }, 4000);
}

// Add animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    @keyframes slideDown {
        0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        100% { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
`;
document.head.appendChild(styleSheet);