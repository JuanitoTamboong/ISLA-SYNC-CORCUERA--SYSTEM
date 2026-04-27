// News page script - fetches real news from Supabase database
document.addEventListener('DOMContentLoaded', function() {
    // Check if Supabase is loaded
    if (typeof supabase === 'undefined') {
        showNotification('Error: Supabase SDK failed to load. Please refresh the page.', 'error');
        return;
    }

    // Supabase configuration
    const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';

    // Initialize Supabase client
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // State
    let allNews = [];
    let filteredNews = [];
    let activeFilter = 'all';
    let searchQuery = '';

    // Category styles mapping
    const CATEGORY_STYLES = {
        'Advisory': 'blue',
        'Tourism': 'purple',
        'Events': 'orange',
        'Community': 'green'
    };

    // Initialize
    init();

    async function init() {
        setupNavigation();
        setupFilters();
        setupSearch();
        await loadNews();
    }

    function setupNavigation() {
        window.navigateTo = function(page) {
            switch(page) {
                case 'home':
                    window.location.href = '../pages/resident-homepage.html';
                    break;
                case 'map':
                    window.location.href = '../pages/map.html';
                    break;
                case 'notifications':
                    // Stay on current page
                    break;
                case 'settings':
                    window.location.href = '../pages/setting.html';
                    break;
            }
        };
    }

    function setupFilters() {
        const pills = document.querySelectorAll('.filters .pill');
        pills.forEach(pill => {
            pill.addEventListener('click', function() {
                // Remove active from all
                pills.forEach(p => p.classList.remove('active'));
                // Add active to clicked
                this.classList.add('active');
                // Set filter
                activeFilter = this.textContent.trim().toLowerCase();
                applyFilters();
            });
        });
    }

    function setupSearch() {
        const searchInput = document.querySelector('.search input');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                searchQuery = e.target.value.trim().toLowerCase();
                applyFilters();
            });
        }
    }

    async function loadNews() {
        const newsContainer = document.getElementById('newsContainer');
        const featuredContainer = document.getElementById('featuredContainer');

        // Show loading state
        if (newsContainer) {
            newsContainer.innerHTML = `
                <div class="loading-state">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <p>Loading news...</p>
                </div>
            `;
        }

        try {
            const { data, error } = await supabaseClient
                .from('news')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                if (error.message && error.message.includes('does not exist')) {
                    showEmptyState('News table not set up yet. Please contact admin.');
                    return;
                }
                throw error;
            }

            allNews = data || [];
            applyFilters();

        } catch (error) {
            console.error('Load news error:', error);
            showEmptyState('Failed to load news. Please try again.');
        }
    }

    function applyFilters() {
        // Filter by category
        if (activeFilter === 'all') {
            filteredNews = [...allNews];
        } else {
            filteredNews = allNews.filter(n => 
                n.category && n.category.toLowerCase() === activeFilter
            );
        }

        // Filter by search query
        if (searchQuery) {
            filteredNews = filteredNews.filter(n =>
                (n.title && n.title.toLowerCase().includes(searchQuery)) ||
                (n.content && n.content.toLowerCase().includes(searchQuery)) ||
                (n.category && n.category.toLowerCase().includes(searchQuery))
            );
        }

        renderNews();
    }

    function renderNews() {
        const featuredContainer = document.getElementById('featuredContainer');
        const newsContainer = document.getElementById('newsContainer');

        if (!newsContainer) return;

        if (filteredNews.length === 0) {
            showEmptyState(searchQuery 
                ? 'No news found matching your search.' 
                : 'No news articles yet. Check back later!'
            );
            if (featuredContainer) featuredContainer.style.display = 'none';
            return;
        }

        // Find featured news (most recent featured, or most recent overall)
        const featuredNews = allNews.find(n => n.featured) || allNews[0];

        // Render featured section
        if (featuredContainer && featuredNews) {
            const featuredImage = featuredNews.image_url || '../assets/generate background image of corquera romblon.jpg';
            const dateStr = featuredNews.created_at
                ? formatRelativeTime(featuredNews.created_at)
                : '';
            const category = featuredNews.category || 'News';

            featuredContainer.style.display = 'block';
            featuredContainer.style.cursor = 'pointer';
            featuredContainer.onclick = function() { viewNewsDetail(featuredNews.id); };
            featuredContainer.innerHTML = `
                <img src="${escapeHtml(featuredImage)}" alt="${escapeHtml(featuredNews.title)}" onerror="this.src='../assets/generate background image of corquera romblon.jpg'">
                <div class="featured-content">
                    <span class="badge">FEATURED</span>
                    <p class="meta">${escapeHtml(dateStr)} • ${escapeHtml(category)}</p>
                    <h3>${escapeHtml(featuredNews.title)}</h3>
                </div>
            `;
        }

        // Render news cards (skip the featured one if it's in filtered list)
        const featuredId = featuredNews ? featuredNews.id : null;
        const displayNews = filteredNews.filter(n => n.id !== featuredId);

        if (displayNews.length === 0) {
            newsContainer.innerHTML = '';
            return;
        }

        const html = displayNews.map(news => {
            const tagClass = CATEGORY_STYLES[news.category] || 'blue';
            const dateStr = news.created_at
                ? new Date(news.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '';
            const imageUrl = news.image_url || '../assets/places/corcuera-municipal-hall.jpg';
            const shortContent = (news.content || '').length > 100
                ? news.content.substring(0, 100) + '...'
                : (news.content || '');

            return `
                <div class="news-card" onclick="viewNewsDetail('${news.id}')">
                    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(news.title)}" onerror="this.src='../assets/places/corcuera-municipal-hall.jpg'">
                    <div>
                        <span class="tag ${tagClass}">${escapeHtml((news.category || 'NEWS').toUpperCase())}</span>
                        <h4>${escapeHtml(news.title)}</h4>
                        <p class="date"><i class="fa-regular fa-calendar"></i> ${escapeHtml(dateStr)}</p>
                        <p class="content-preview">${escapeHtml(shortContent)}</p>
                    </div>
                </div>
            `;
        }).join('');

        newsContainer.innerHTML = html;
    }

    function showEmptyState(message) {
        const newsContainer = document.getElementById('newsContainer');
        if (newsContainer) {
            newsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-newspaper"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    // View news detail
    window.viewNewsDetail = function(newsId) {
        const news = allNews.find(n => n.id === newsId);
        if (!news) return;

        // Create a modal to show full news content
        const modal = document.createElement('div');
        modal.className = 'news-detail-modal';

        const tagClass = CATEGORY_STYLES[news.category] || 'blue';
        const dateStr = news.created_at
            ? new Date(news.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : '';
        const imageUrl = news.image_url || '../assets/generate background image of corquera romblon.jpg';

        modal.innerHTML = `
            <div class="news-detail-card">
                <div class="news-detail-hero">
                    <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(news.title)}" onerror="this.style.display='none'">
                    <button class="news-detail-close" onclick="this.closest('.news-detail-modal').remove()">×</button>
                </div>
                <div class="news-detail-padding">
                    <span class="tag ${tagClass}" style="margin-bottom: 10px; display: inline-block;">${escapeHtml((news.category || 'NEWS').toUpperCase())}</span>
                    <h2 class="news-detail-title">${escapeHtml(news.title)}</h2>
                    <p class="news-detail-meta">
                        <i class="fa-regular fa-calendar"></i> ${escapeHtml(dateStr)}
                    </p>
                    <div class="news-detail-body">
                        ${escapeHtml(news.content || 'No content available.')}
                    </div>
                </div>
            </div>
        `;

        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.remove();
        });

        document.body.appendChild(modal);
    };

    // Format relative time
    function formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Notification function
    function showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) existingNotification.remove();

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
});

