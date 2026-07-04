const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';

let supabaseClient = null;
let currentUser = null;
let allReports = [];
let activeFilter = 'all';
let currentReportId = null;
let currentReportComments = [];

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
        const map = { '&': '&amp;', '<': '<', '>': '>', '"': '&quot;' };
        return map[m];
    });
}

function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
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
        return null;
    }
    return data;
}

// ============================================
// COMMENTS FUNCTIONS - FIXED
// ============================================

async function fetchComments(reportId) {
    try {
        const { data: comments, error: commentsError } = await supabaseClient
            .from('report_comments')
            .select('*')
            .eq('report_id', reportId)
            .order('created_at', { ascending: true });
        
        if (commentsError) throw commentsError;
        
        if (!comments || comments.length === 0) {
            return [];
        }
        
        const userIds = comments.map(c => c.user_id).filter(id => id);
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
        
        return comments.map(comment => ({
            ...comment,
            profiles: profilesMap[comment.user_id] || null
        }));
        
    } catch {
        return [];
    }
}

async function addComment(reportId, comment) {
    try {
        const { data, error } = await supabaseClient
            .from('report_comments')
            .insert([{
                report_id: reportId,
                user_id: currentUser.id,
                comment: comment,
                is_admin: currentUser.userType === 'admin'
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
    } catch {
        return null;
    }
}

// ============================================
// FIXED DELETE COMMENT
// ============================================

async function deleteComment(commentId) {
    try {
        // First verify the comment exists and get its data
        const { data: comment, error: fetchError } = await supabaseClient
            .from('report_comments')
            .select('user_id, report_id')
            .eq('id', commentId)
            .single();
        
        if (fetchError) {
            showNotification('Comment not found.', 'error');
            return false;
        }
        
        // Check authorization
        if (comment.user_id !== currentUser.id && currentUser.userType !== 'admin') {
            showNotification('You are not authorized to delete this comment.', 'error');
            return false;
        }
        
        // Delete the comment using the correct ID
        const { error: deleteError } = await supabaseClient
            .from('report_comments')
            .delete()
            .eq('id', commentId);
        
        if (deleteError) {
            showNotification('Failed to delete comment: ' + deleteError.message, 'error');
            return false;
        }
        
        return true;
    } catch (error) {
        showNotification('An error occurred while deleting.', 'error');
        return false;
    }
}

function renderComments(comments) {
    const container = document.getElementById('commentsContainer');
    
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
        
        const canDelete = (comment.user_id === currentUser?.id) || (currentUser?.userType === 'admin');
        
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
                        ${canDelete ? `<button class="comment-delete-btn" onclick="handleDeleteComment('${comment.id}')" title="Delete comment">
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

window.handleDeleteComment = async function(commentId) {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    const success = await deleteComment(commentId);
    
    if (success) {
        showNotification('Comment deleted successfully!', 'success');
        // Force refresh comments from database
        if (currentReportId) {
            const freshComments = await fetchComments(currentReportId);
            currentReportComments = freshComments;
            renderComments(freshComments);
        }
    }
};

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

function populateModal(report) {
    document.getElementById('modalTitle').textContent = 'Report Details';
    
    const reference = report.reference || 'N/A';
    document.getElementById('modalReferenceTitle').textContent = reference;
    
    const rawStatus = (report.status || '').toLowerCase();
    const status = rawStatus ? rawStatus.toUpperCase().replace('_', ' ') : 'PENDING';
    document.getElementById('modalBadge').textContent = status;
    
    const dateStr = report.created_at ? new Date(report.created_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'Unknown';
    document.getElementById('modalDateTime').textContent = `Submitted on ${dateStr}`;
    
    const category = report.category || detectCategory(report);
    const categoryTitle = category.toString().toUpperCase().replace(/_/g, ' ');
    document.getElementById('modalCategory').textContent = categoryTitle;
    
    const location = report.location_address || report.location || 'Not specified';
    document.getElementById('modalLocationText').textContent = location.length > 25 ? location.substring(0, 25) + '...' : location;
    
    document.getElementById('modalDescription').textContent = report.description || 'No description provided.';
    
    const timelineTime = report.created_at ? new Date(report.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }) : 'Recently';
    document.getElementById('modalTimelineTime').textContent = timelineTime;
    
    const step2 = document.getElementById('modalTimelineStep2');
    const step3 = document.getElementById('modalTimelineStep3');
    const step2Time = document.getElementById('modalTimelineStep2Time');
    const step2Title = document.getElementById('modalTimelineStep2Title');
    const step2Desc = document.getElementById('modalTimelineStep2Desc');
    const step3Time = document.getElementById('modalTimelineStep3Time');
    const step3Title = document.getElementById('modalTimelineStep3Title');
    const step3Desc = document.getElementById('modalTimelineStep3Desc');

    const isResolved = rawStatus === 'resolved';

    if (step2) step2.style.display = isResolved ? 'none' : 'block';
    if (step3) step3.style.display = isResolved ? 'block' : 'none';

    if (!isResolved) {
        if (step2Time) step2Time.textContent = 'Pending Review';
        if (step2Title) step2Title.textContent = 'Under Review';
        if (step2Desc) step2Desc.textContent = 'The local department will verify the report details.';
    } else {
        if (step3Time) step3Time.textContent = 'Resolved';
        if (step3Title) step3Title.textContent = 'Report Resolved';
        if (step3Desc) step3Desc.textContent = 'Your report has been resolved. Thank you!';
    }
    
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

async function loadReportWithComments(reportId) {
    const report = await fetchReportDetail(reportId);
    if (!report) return null;
    
    const comments = await fetchComments(reportId);
    currentReportComments = comments;
    
    return { report, comments };
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
    currentReportId = null;
    currentReportComments = [];
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
    } catch {
        window.location.href = '../pages/login.html';
        return;
    }
    
    document.getElementById('loadingState').style.display = 'flex';
    
    allReports = await fetchUserReports(currentUser.id);
    document.getElementById('loadingState').style.display = 'none';
    
    renderCategorizedReports();
    
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            activeFilter = this.dataset.filter;
            renderCategorizedReports();
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initPage();
    
    document.getElementById('backBtn').onclick = function() { window.history.back(); };
    document.getElementById('submitNewBtn').onclick = function() { window.location.href = '../pages/report.html'; };
    document.getElementById('emptySubmitBtn').onclick = function() { window.location.href = '../pages/report.html'; };
    
    document.getElementById('modalClose').onclick = hideModal;
    document.getElementById('modalOverlay').onclick = hideModal;
    
    document.getElementById('commentToggleBtn').addEventListener('click', function() {
        const input = document.getElementById('commentInput');
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    
    document.getElementById('submitCommentBtn').addEventListener('click', async function() {
        const input = document.getElementById('commentInput');
        const comment = input.value.trim();
        
        if (!comment || !currentReportId) return;
        
        const btn = this;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
        
        const newComment = await addComment(currentReportId, comment);
        
        if (newComment) {
            input.value = '';
            currentReportComments.push(newComment);
            renderComments(currentReportComments);
            showNotification('Comment added successfully!', 'success');
        } else {
            showNotification('Failed to add comment. Please try again.', 'error');
        }
        
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send';
    });
    
    document.getElementById('commentInput').addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            document.getElementById('submitCommentBtn').click();
        }
    });
    
    document.body.addEventListener('click', async function(e) {
        const reportItem = e.target.closest('.report-item');
        if (reportItem && reportItem.dataset.id && supabaseClient) {
            const reportId = reportItem.dataset.id;
            currentReportId = reportId;
            
            const loadingDiv = document.getElementById('loadingState');
            loadingDiv.innerHTML = '<div class="loader-overlay">'
                + '<div class="loader-box">'
                + '<i class="fa-solid fa-spinner fa-pulse"></i>'
                + '<div>Loading details...</div>'
                + '</div>'
                + '</div>';
            loadingDiv.style.display = 'flex';

            const result = await loadReportWithComments(reportId);

            loadingDiv.style.display = 'none';
            loadingDiv.innerHTML = '';

            if (result) {
                populateModal(result.report);
                renderComments(result.comments);
                showModal();
            }
        }
    });
});

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
    setTimeout(function() {
        if (notification && notification.parentNode) notification.remove();
    }, 4000);
}