// Admin Homepage Script
document.addEventListener('DOMContentLoaded', async function() {
    if (typeof supabase === 'undefined') {
        showNotification('Error: Supabase SDK failed to load.', 'error');
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

    // Update UI
    updateGreeting();
    document.getElementById('adminName').textContent = admin.fullName || 'Admin';

    // Notification state (must be declared before any await that uses it)
    let notifications = [];
    let notifReadIds = JSON.parse(localStorage.getItem('adminNotifReadIds') || '[]');
    let profileMap = {};

    // Load admin profile photo
    await loadAdminProfilePhoto(supabaseClient, admin.id);

    // Load notifications (new reports)
    await loadNotifications(supabaseClient);

    // Load stats and recent reports
    loadDashboardData(supabaseClient);

    // Navigation handlers
    window.navigateTo = function(page) {
        switch(page) {
            case 'home':
                // Already here
                break;
            case 'map':
                window.location.href = 'admin-map.html';
                break;
            case 'news':
                window.location.href = 'admin-news.html';
                break;
            case 'settings':
                window.location.href = 'admin-settings.html';
                break;
        }
    };

    window.goToNews = function() {
        window.location.href = 'admin-news.html';
    };

    window.goToAllReports = function() {
        window.location.href = 'admin-map.html';
    };

    window.goToProfile = function() {
        window.location.href = 'admin-profile.html';
    };

    async function loadAdminProfilePhoto(supabaseClient, adminId) {
        try {
            const { data: profile, error } = await supabaseClient
                .from('profiles')
                .select('avatar_url')
                .eq('id', adminId)
                .single();

            if (error || !profile) return;

            const profileImg = document.getElementById('profileImg');
            if (profileImg && profile.avatar_url) {
                profileImg.src = profile.avatar_url;
                profileImg.style.display = 'block';
                profileImg.onerror = function() {
                    this.style.display = 'none';
                };
            }
        } catch (error) {
            // Silently fail - keep default icon
        }
    }

    async function loadProfileMap(supabaseClient, userIds) {
        if (!userIds || userIds.length === 0) return;
        try {
            const { data, error } = await supabaseClient
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);
            if (!error && data) {
                data.forEach(p => { profileMap[p.id] = p.full_name; });
            }
        } catch (e) {
            // Silently fail
        }
    }

    function attachReporterNames(reports) {
        (reports || []).forEach(r => {
            r.reporter_name = profileMap[r.user_id] || null;
        });
    }

    // ========== NOTIFICATION SYSTEM ==========

    async function loadNotifications(supabaseClient) {
        try {
            const { data: reports, error } = await supabaseClient
                .from('reports')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            // Load reporter names manually
            const userIds = [...new Set((reports || []).map(r => r.user_id).filter(Boolean))];
            await loadProfileMap(supabaseClient, userIds);
            attachReporterNames(reports);

            notifications = [];
            const categoryIcons = {
                'INFRASTRUCTURE': { icon: 'fa-road', color: 'blue' },
                'PUBLIC SAFETY': { icon: 'fa-shield-halved', color: 'orange' },
                'ENGINEERING': { icon: 'fa-people-group', color: 'purple' },
                'TRAFFIC VIOLATION': { icon: 'fa-traffic-light', color: 'red' }
            };

            (reports || []).forEach(report => {
                const cat = categoryIcons[report.category] || { icon: 'fa-circle-exclamation', color: 'blue' };
                const timeAgo = getTimeAgo(report.created_at);
                notifications.push({
                    id: `report-${report.id}`,
                    reportId: report.id,
                    icon: cat.icon,
                    iconColor: cat.color,
                    title: `New ${report.category || 'Report'}`,
                    message: report.description || 'No description',
                    time: timeAgo,
                    read: notifReadIds.includes(`report-${report.id}`)
                });
            });

            renderNotifications();
            setupNotificationEvents();

        } catch (e) {
            console.error('Load notifications error:', e);
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
                    <i class="fa-regular fa-bell-slash"></i>
                    <p>No new reports</p>
                </div>
            `;
            return;
        }

        notifList.innerHTML = unreadNotifs.map(notif => `
            <div class="notif-item unread" onclick="handleNotifClick(event, '${notif.id}', '${notif.reportId}')">
                <div class="notif-icon ${notif.iconColor}">
                    <i class="fa-solid ${notif.icon}"></i>
                </div>
                <div class="notif-content">
                    <p>${escapeHtml(notif.title)}</p>
                    <span>${escapeHtml(notif.message.substring(0, 40))}${notif.message.length > 40 ? '...' : ''} &bull; ${notif.time}</span>
                </div>
        `).join('');
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

        // Navigate to report on map
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
            // Fetch all reports
            const { data: reports, error: reportsError } = await supabaseClient
                .from('reports')
                .select('*')
                .order('created_at', { ascending: false });

            if (reportsError) throw reportsError;

            // Load reporter names manually
            const userIds = [...new Set((reports || []).map(r => r.user_id).filter(Boolean))];
            await loadProfileMap(supabaseClient, userIds);
            attachReporterNames(reports);

            const allReports = reports || [];
            const pending = allReports.filter(r => r.status !== 'resolved');
            const resolved = allReports.filter(r => r.status === 'resolved');

            // Update stats
            animateNumber('totalReports', allReports.length);
            animateNumber('pendingReports', pending.length);
            animateNumber('resolvedReports', resolved.length);

            // Fetch user count
            const { count: userCount, error: userError } = await supabaseClient
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('user_type', 'resident');

            if (!userError) {
                animateNumber('totalUsers', userCount || 0);
            }

            // Render recent reports (last 5)
            renderRecentReports(allReports.slice(0, 5));

        } catch (error) {
            console.error('Dashboard load error:', error);
            showNotification('Failed to load dashboard data', 'error');
            document.getElementById('recentReportsList').innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>Failed to load reports</p>
                </div>
            `;
        }
    }

    function renderRecentReports(reports) {
        const container = document.getElementById('recentReportsList');

        if (!reports || reports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-folder-open"></i>
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
            const statusClass = report.status === 'resolved' ? 'resolved' : 'pending';
            const statusText = report.status === 'resolved' ? 'Resolved' : 'Pending';
            const shortDesc = (report.description || '').length > 90
                ? report.description.substring(0, 90) + '...'
                : (report.description || 'No description');
            const dateStr = report.created_at
                ? new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '';

            const hasImage = report.image_url && report.image_url.startsWith('data:');
            const imageHtml = hasImage
                ? `<img src="${escapeHtml(report.image_url)}" alt="Report Image" class="report-image">`
                : `<div class="report-icon ${cat.class}"><i class="fa-solid ${cat.icon}"></i></div>`;

            return `
                <div class="recent-report-item" onclick="viewReportOnMap('${report.id}')">
                    <div class="report-image-wrapper">
                        ${imageHtml}
                    </div>
                    <div class="report-info">
                        <h4 class="report-reporter">${escapeHtml(report.reporter_name || 'Unknown')}</h4>
                        <p class="report-meta">${escapeHtml(report.category || '')} &middot; ${dateStr}</p>
                        <p class="report-id">ID: #${escapeHtml(report.reference || 'N/A')}</p>
                        <p class="report-desc">${escapeHtml(shortDesc)}</p>
                    </div>
                    <span class="report-status-badge ${statusClass}">${statusText}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    window.viewReportOnMap = function(reportId) {
        sessionStorage.setItem('highlightReportId', reportId);
        window.location.href = 'admin-map.html';
    };

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
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification && notification.parentNode) notification.remove();
        }, 4000);
    }
});

