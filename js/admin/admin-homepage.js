// Navigation functions
window.navigateTo = function(page) {
    const pages = {
        'home': 'admin-homepage.html',
        'map': 'admin-map.html',
        'news': 'admin-news.html',
        'settings': 'admin-settings.html'
    };
    if (pages[page]) {
        window.location.href = pages[page];
    }
};

window.goToNews = function() {
    window.location.href = 'admin-news.html';
};

window.goToTouristSpots = function() {
    window.location.href = 'admin-tourist-spots.html';
};

window.goToAllReports = function() {
    window.location.href = 'admin-map.html';
};

window.goToProfile = function() {
    window.location.href = 'admin-profile.html';
};

window.viewReportOnMap = function(reportId) {
    sessionStorage.setItem('highlightReportId', reportId);
    window.location.href = 'admin-map.html';
};

// Main application
document.addEventListener('DOMContentLoaded', async function() {
    if (typeof supabase === 'undefined') {
        showNotification('Error: Configuration failed to load.', 'error');
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

    // Initialize
    updateGreeting();
    document.getElementById('adminName').textContent = admin.fullName || 'Admin';

    const initials = getInitials(admin.fullName || 'Admin');
    document.getElementById('profileInitials').textContent = initials;

    let notifications = [];
    let notifReadIds = JSON.parse(localStorage.getItem('adminNotifReadIds') || '[]');
    let userAvatars = {};

    await loadAdminProfilePhoto(supabaseClient, admin.id);
    await loadNotifications(supabaseClient);
    await loadDashboardData(supabaseClient);

    // Helper functions
    function getInitials(name) {
        if (!name) return 'A';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    function getColorFromName(name) {
        const colors = [
            '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
            '#ec4899', '#f43f5e', '#ef4444', '#f59e0b',
            '#10b981', '#06b6d4', '#3b82f6', '#4f46e5'
        ];
        if (!name) return colors[0];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    async function loadUserAvatars(userIds) {
        if (!userIds || userIds.length === 0) return;
        
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
        } catch (e) {
            // Silent fail
        }
    }

    async function loadAdminProfilePhoto(supabaseClient, adminId) {
        try {
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('avatar_url')
                .eq('id', adminId)
                .maybeSingle();

            if (error || !profile) return;

            const profileContainer = document.getElementById('profileContainer');
            const profileImg = document.getElementById('profileImg');
            if (profileContainer) {
                profileContainer.classList.remove('has-image');
            }
            if (profileImg && profile.avatar_url && profile.avatar_url.trim() !== '') {
                profileImg.src = profile.avatar_url;
                profileImg.onload = function() {
                    if (profileContainer) {
                        profileContainer.classList.add('has-image');
                    }
                };
                profileImg.onerror = function() {
                    if (profileContainer) {
                        profileContainer.classList.remove('has-image');
                    }
                    profileImg.src = '';
                };
            }
        } catch (error) {
            // Silent fail
        }
    }

    async function loadNotifications(supabaseClient) {
        try {
            const { data: reports, error } = await supabaseClient
                .from('reports_with_users')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            const userIds = reports
                .map(r => r.user_id)
                .filter(id => id && !userAvatars[id]);
            
            if (userIds.length > 0) {
                await loadUserAvatars(userIds);
            }

            notifications = [];

            (reports || []).forEach(report => {
                const timeAgo = getTimeAgo(report.created_at);
                const user = userAvatars[report.user_id] || {};
                const avatarUrl = report.avatar_url || user.avatar_url;
                const reporterName = report.reporter_name || user.full_name || 'Unknown';
                const initials = getInitials(reporterName);
                const color = getColorFromName(reporterName);
                
                notifications.push({
                    id: `report-${report.id}`,
                    reportId: report.id,
                    title: escapeHtml(reporterName),
                    message: `${escapeHtml(report.category || 'Report')} • ${escapeHtml(report.description || 'No description')}`,
                    time: timeAgo,
                    read: notifReadIds.includes(`report-${report.id}`),
                    avatarUrl: avatarUrl,
                    initials: initials,
                    color: color
                });
            });

            renderNotifications();
            setupNotificationEvents();

        } catch (e) {
            const notifList = document.getElementById('notifList');
            if (notifList) {
                notifList.innerHTML = `
                    <div class="notif-empty">
                        <i class="fas fa-bell-slash"></i>
                        <p>No notifications</p>
                    </div>
                `;
            }
        }
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

    function renderNotifications() {
        const notifList = document.getElementById('notifList');
        const notifBadge = document.getElementById('notifBadge');
        if (!notifList) return;

        const unreadNotifs = notifications.filter(n => !n.read);
        const unreadCount = unreadNotifs.length;

        if (notifBadge) {
            if (unreadCount > 0) {
                notifBadge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                notifBadge.style.display = 'flex';
            } else {
                notifBadge.style.display = 'none';
            }
        }

        if (unreadNotifs.length === 0) {
            notifList.innerHTML = `
                <div class="notif-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No new reports</p>
                </div>
            `;
            return;
        }

        notifList.innerHTML = unreadNotifs.map(notif => {
            const avatarHtml = notif.avatarUrl 
                ? `<img src="${escapeHtml(notif.avatarUrl)}" alt="${escapeHtml(notif.title)}" class="notif-avatar-img">`
                : `<span class="notif-avatar-initials" style="background: ${notif.color || '#6366f1'}">${notif.initials || 'U'}</span>`;

            return `
                <div class="notif-item unread" onclick="handleNotifClick(event, '${notif.id}', '${notif.reportId}')">
                    <div class="notif-avatar">
                        ${avatarHtml}
                    </div>
                    <div class="notif-content">
                        <p>${notif.title}</p>
                        <span>${notif.message} • ${notif.time}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function setupNotificationEvents() {
        const notificationBell = document.getElementById('notificationBell');
        const notificationPanel = document.getElementById('notificationPanel');

        if (notificationBell && notificationPanel) {
            notificationBell.addEventListener('click', (e) => {
                e.stopPropagation();
                notificationPanel.classList.toggle('show');
            });
            document.addEventListener('click', (e) => {
                if (!notificationBell.contains(e.target) && !notificationPanel.contains(e.target)) {
                    notificationPanel.classList.remove('show');
                }
            });
        }
    }

    window.handleNotifClick = function(event, notifId, reportId) {
        event.stopPropagation();

        if (!notifReadIds.includes(notifId)) {
            notifReadIds.push(notifId);
            localStorage.setItem('adminNotifReadIds', JSON.stringify(notifReadIds));
        }

        const notif = notifications.find(n => n.id === notifId);
        if (notif) notif.read = true;

        const notificationPanel = document.getElementById('notificationPanel');
        if (notificationPanel) notificationPanel.classList.remove('show');

        if (reportId) {
            sessionStorage.setItem('highlightReportId', reportId);
            window.location.href = 'admin-map.html';
        }
    };

    window.markAllRead = function() {
        notifications.forEach(n => {
            if (!notifReadIds.includes(n.id)) {
                notifReadIds.push(n.id);
            }
        });
        localStorage.setItem('adminNotifReadIds', JSON.stringify(notifReadIds));
        renderNotifications();
    };

    async function loadDashboardData(supabaseClient) {
        try {
            const now = new Date();
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

            const { data: reports, error: reportsError } = await supabaseClient
                .from('reports_with_users')
                .select('*')
                .order('created_at', { ascending: false });

            if (reportsError) throw reportsError;

            const allReports = reports || [];
            const pending = allReports.filter(r => r.status !== 'resolved' && r.status !== 'Resolved');
            const resolved = allReports.filter(r => r.status === 'resolved' || r.status === 'Resolved');

            animateNumber('totalReports', allReports.length);
            animateNumber('pendingReports', pending.length);
            animateNumber('resolvedReports', resolved.length);

            // Calculate percentages
            const thisMonthReports = allReports.filter(r => 
                new Date(r.created_at) >= firstDayOfMonth
            );
            const lastMonthReports = allReports.filter(r => 
                new Date(r.created_at) >= firstDayOfLastMonth && 
                new Date(r.created_at) < firstDayOfMonth
            );
            
            const totalPercent = calculatePercentChange(thisMonthReports.length, lastMonthReports.length);
            updateTrendDisplay('totalTrend', 'totalPercent', totalPercent);

            const resolvedThisMonth = thisMonthReports.filter(r => 
                r.status === 'resolved' || r.status === 'Resolved'
            ).length;
            const resolvedLastMonth = lastMonthReports.filter(r => 
                r.status === 'resolved' || r.status === 'Resolved'
            ).length;
            const resolvedPercent = calculatePercentChange(resolvedThisMonth, resolvedLastMonth);
            updateTrendDisplay('resolvedTrend', 'resolvedPercent', resolvedPercent);

            // Get user data
            const { data: users, error: userError } = await supabaseClient
                .from('profiles')
                .select('created_at')
                .eq('user_type', 'resident');

            if (!userError && users) {
                animateNumber('totalUsers', users.length);
                
                const thisMonthUsers = users.filter(u => 
                    new Date(u.created_at) >= firstDayOfMonth
                ).length;
                const lastMonthUsers = users.filter(u => 
                    new Date(u.created_at) >= firstDayOfLastMonth && 
                    new Date(u.created_at) < firstDayOfMonth
                ).length;
                const userPercent = calculatePercentChange(thisMonthUsers, lastMonthUsers);
                updateTrendDisplay('userTrend', 'userPercent', userPercent);
            }

            renderRecentReports(allReports.slice(0, 5));

        } catch (error) {
            showNotification('Failed to load dashboard data', 'error');
            const container = document.getElementById('recentReportsList');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load reports</p>
                    </div>
                `;
            }
        }
    }

    function calculatePercentChange(current, previous) {
        if (previous === 0) {
            return current > 0 ? 100 : 0;
        }
        return Math.round(((current - previous) / previous) * 100);
    }

    function updateTrendDisplay(trendId, percentId, percent) {
        const trendElement = document.getElementById(trendId);
        const percentElement = document.getElementById(percentId);
        
        if (!trendElement || !percentElement) return;
        
        const isPositive = percent >= 0;
        const arrow = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
        const className = isPositive ? 'positive' : 'negative';
        const displayPercent = Math.abs(percent);
        
        trendElement.className = `stat-trend ${className}`;
        trendElement.innerHTML = `<i class="fas ${arrow}"></i> <span id="${percentId}">${displayPercent}</span>% this month`;
    }

    function renderRecentReports(reports) {
        const container = document.getElementById('recentReportsList');
        if (!container) return;

        if (!reports || reports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>No reports submitted yet</p>
                </div>
            `;
            return;
        }

        const categoryIcons = {
            'INFRASTRUCTURE': { icon: 'fa-road', class: 'infra' },
            'PUBLIC SAFETY': { icon: 'fa-shield-halved', class: 'safety' },
            'ENGINEERING': { icon: 'fa-people-group', class: 'eng' },
            'TRAFFIC VIOLATION': { icon: 'fa-traffic-light', class: 'traffic' }
        };

        const html = reports.map(report => {
            const cat = categoryIcons[report.category] || { icon: 'fa-circle-exclamation', class: 'infra' };
            const statusClass = (report.status === 'resolved' || report.status === 'Resolved') ? 'resolved' : 'pending';
            const statusText = (report.status === 'resolved' || report.status === 'Resolved') ? 'Resolved' : 'Pending';
            const shortDesc = (report.description || '').length > 90
                ? report.description.substring(0, 90) + '...'
                : (report.description || 'No description');
            const dateStr = report.created_at
                ? new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '';

            const reporterName = report.reporter_name || 'Unknown';
            const hasImage = report.image_url && report.image_url.startsWith('data:');
            const imageHtml = hasImage
                ? `<img src="${escapeHtml(report.image_url)}" alt="Report Image" class="report-image">`
                : `<div class="report-icon ${cat.class}"><i class="fas ${cat.icon}"></i></div>`;

            return `
                <div class="recent-report-item" onclick="viewReportOnMap('${report.id}')">
                    <div class="report-image-wrapper">
                        ${imageHtml}
                    </div>
                    <div class="report-info">
                        <p class="report-reporter">${escapeHtml(reporterName)}</p>
                        <p class="report-meta">${escapeHtml(report.category || '')} • ${dateStr}</p>
                        <p class="report-id">#${escapeHtml(report.reference || 'N/A')}</p>
                        <p class="report-desc">${escapeHtml(shortDesc)}</p>
                    </div>
                    <span class="report-status-badge ${statusClass}">${statusText}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    function animateNumber(elementId, target) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const duration = 800;
        const start = 0;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (target - start) * easeProgress);
            el.textContent = current;
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        requestAnimationFrame(update);
    }

    function updateGreeting() {
        const el = document.getElementById('greetingText');
        if (!el) return;
        const hour = new Date().getHours();
        let greeting = 'Good Evening,';
        if (hour < 12) greeting = 'Good Morning,';
        else if (hour < 18) greeting = 'Good Afternoon,';
        el.textContent = greeting;
    }

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
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification && notification.parentNode) notification.remove();
        }, 4000);
    }
});