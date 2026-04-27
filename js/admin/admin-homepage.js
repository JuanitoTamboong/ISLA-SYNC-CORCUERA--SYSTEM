// Admin Homepage Script
document.addEventListener('DOMContentLoaded', function() {
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
            case 'profile':
                window.location.href = 'admin-profile.html';
                break;
        }
    };

    window.goToMap = function() {
        window.location.href = 'admin-map.html';
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

    async function loadDashboardData(supabaseClient) {
        try {
            // Fetch all reports
            const { data: reports, error: reportsError } = await supabaseClient
                .from('reports')
                .select('*')
                .order('created_at', { ascending: false });

            if (reportsError) throw reportsError;

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
            const shortDesc = (report.description || '').length > 40
                ? report.description.substring(0, 40) + '...'
                : (report.description || 'No description');
            const dateStr = report.created_at
                ? new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : '';

            return `
                <div class="recent-report-item" onclick="viewReportOnMap('${report.id}')">
                    <div class="report-icon ${cat.class}">
                        <i class="fa-solid ${cat.icon}"></i>
                    </div>
                    <div class="report-info">
                        <h4>${escapeHtml(report.reference || 'Report')}</h4>
                        <p>${escapeHtml(shortDesc)} &middot; ${dateStr}</p>
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

