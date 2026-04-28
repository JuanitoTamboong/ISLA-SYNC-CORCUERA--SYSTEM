// Admin News Management Script
const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';

let supabaseClient = null;
let allNews = [];
let filteredNews = [];
let activeFilter = 'all';
let deleteTargetId = null;
window.selectedNewsImage = null;
window.currentNewsImageUrl = null;

const DEFAULT_IMAGE = '../../assets/generate background image of corquera romblon.jpg';

const CATEGORY_STYLES = {
    'Advisory': 'advisory',
    'Tourism': 'tourism',
    'Events': 'events',
    'Community': 'community'
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

    // Load news
    loadNews();

    // Setup filters
    setupFilters();

    // Form submit
    document.getElementById('newsForm').addEventListener('submit', handleFormSubmit);

    // Image upload listener
    const newsImageInput = document.getElementById('newsImageInput');
    if (newsImageInput) {
        newsImageInput.addEventListener('change', handleNewsImageUpload);
    }
});

async function loadNews() {
    try {
        const { data, error } = await supabaseClient
            .from('news')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            // If table doesn't exist yet, show empty state
            if (error.message && error.message.includes('does not exist')) {
                showEmptyState('News table not set up yet. Run the SQL in Supabase first.');
                return;
            }
            throw error;
        }

        allNews = data || [];
        applyFilter(activeFilter);

    } catch (error) {
        console.error('Load news error:', error);
        showNotification('Failed to load news', 'error');
        showEmptyState('Failed to load news. Please try again.');
    }
}

function applyFilter(filter) {
    activeFilter = filter;

    if (filter === 'all') {
        filteredNews = [...allNews];
    } else {
        filteredNews = allNews.filter(n => n.category === filter);
    }

    renderNewsList();
}

function renderNewsList() {
    const container = document.getElementById('newsList');

    if (filteredNews.length === 0) {
        showEmptyState('No news articles yet. Tap + to create one.');
        return;
    }

    const html = filteredNews.map(news => {
        const tagClass = CATEGORY_STYLES[news.category] || 'advisory';
        const dateStr = news.created_at
            ? new Date(news.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';
        const shortContent = (news.content || '').length > 100
            ? news.content.substring(0, 100) + '...'
            : (news.content || '');
        const imageUrl = news.image_url;
        const hasImage = !!imageUrl;

        return `
            <div class="news-card">
                ${hasImage
                    ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(news.title)}" class="news-image">`
                    : `<div class="news-image-placeholder"><i class="fa-regular fa-image"></i></div>`
                }
                <div class="news-body">
                    <div class="news-header">
                        <span class="news-tag ${tagClass}">${escapeHtml(news.category)}</span>
                        ${news.featured ? '<span class="news-featured-badge"><i class="fa-solid fa-star"></i> Featured</span>' : ''}
                    </div>
                    <h4 class="news-title">${escapeHtml(news.title)}</h4>
                    <p class="news-content">${escapeHtml(shortContent)}</p>
                    <div class="news-meta">
                        <span class="news-date">
                            <i class="fa-regular fa-calendar"></i> ${dateStr}
                        </span>
                        <div class="news-actions">
                            <button class="edit-btn" onclick="editNews('${news.id}')" aria-label="Edit news">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="delete-btn" onclick="deleteNews('${news.id}')" aria-label="Delete news">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

function showEmptyState(message) {
    document.getElementById('newsList').innerHTML = `
        <div class="empty-state">
            <i class="fa-regular fa-newspaper"></i>
            <p>${message}</p>
        </div>
    `;
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

// Modal functions
window.openNewsModal = function(newsId = null) {
    const modal = document.getElementById('newsModal');
    const form = document.getElementById('newsForm');
    const titleEl = document.getElementById('modalTitle');
    const saveBtn = document.getElementById('saveBtn');

    form.reset();
    document.getElementById('newsId').value = '';
    window.selectedNewsImage = null;
    window.currentNewsImageUrl = null;

    // Reset image UI
    const uploadBox = document.getElementById('newsUploadBox');
    const previewDiv = document.getElementById('newsPreviewDiv');
    const previewImg = document.getElementById('newsPreviewImg');
    const fileInput = document.getElementById('newsImageInput');
    if (uploadBox) uploadBox.style.display = 'flex';
    if (previewDiv) previewDiv.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (fileInput) fileInput.value = '';

    if (newsId) {
        const news = allNews.find(n => n.id === newsId);
        if (!news) return;

        titleEl.textContent = 'Edit News';
        document.getElementById('newsId').value = news.id;
        document.getElementById('newsTitle').value = news.title || '';
        document.getElementById('newsCategory').value = news.category || 'Advisory';
        document.getElementById('newsContent').value = news.content || '';
        document.getElementById('newsFeatured').checked = news.featured || false;
        saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Update News';

        // Show existing image if available
        if (news.image_url) {
            window.currentNewsImageUrl = news.image_url;
            if (uploadBox) uploadBox.style.display = 'none';
            if (previewDiv) previewDiv.style.display = 'block';
            if (previewImg) previewImg.src = news.image_url;
        }
    } else {
        titleEl.textContent = 'Create News';
        saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save News';
    }

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
};

window.closeNewsModal = function() {
    document.getElementById('newsModal').classList.remove('show');
    document.body.style.overflow = 'auto';
};

async function handleFormSubmit(e) {
    e.preventDefault();

    const newsId = document.getElementById('newsId').value;
    const title = document.getElementById('newsTitle').value.trim();
    const category = document.getElementById('newsCategory').value;
    const content = document.getElementById('newsContent').value.trim();
    const featured = document.getElementById('newsFeatured').checked;

    if (!title || !content) {
        showNotification('Title and content are required', 'error');
        return;
    }

    const saveBtn = document.getElementById('saveBtn');
    const originalHtml = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        // Use newly selected image (base64) if available, otherwise keep existing URL
        let imageUrl = window.selectedNewsImage || window.currentNewsImageUrl || null;

        const newsData = {
            title,
            category,
            content,
            image_url: imageUrl,
            featured
        };

        if (newsId) {
            // Update
            const { error } = await supabaseClient
                .from('news')
                .update(newsData)
                .eq('id', newsId);

            if (error) throw error;
            showNotification('News updated successfully!', 'success');
        } else {
            // Insert
            const { error } = await supabaseClient
                .from('news')
                .insert([newsData]);

            if (error) throw error;
            showNotification('News created successfully!', 'success');
        }

        closeNewsModal();
        loadNews();

    } catch (error) {
        console.error('Save news error:', error);
        showNotification('Failed to save news: ' + error.message, 'error');
    } finally {
        saveBtn.innerHTML = originalHtml;
        saveBtn.disabled = false;
    }
}

window.editNews = function(newsId) {
    openNewsModal(newsId);
};

window.deleteNews = function(newsId) {
    deleteTargetId = newsId;
    document.getElementById('deleteModal').classList.add('show');
    document.body.style.overflow = 'hidden';
};

window.closeDeleteModal = function() {
    document.getElementById('deleteModal').classList.remove('show');
    document.body.style.overflow = 'auto';
    deleteTargetId = null;
};

window.confirmDelete = async function() {
    if (!deleteTargetId || !supabaseClient) return;

    const btn = document.getElementById('confirmDeleteBtn');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';
    btn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('news')
            .delete()
            .eq('id', deleteTargetId);

        if (error) throw error;

        showNotification('News deleted successfully!', 'success');
        closeDeleteModal();
        loadNews();

    } catch (error) {
        console.error('Delete news error:', error);
        showNotification('Failed to delete news', 'error');
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
};

// Image upload helpers
function handleNewsImageUpload(e) {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) {
        showNotification('Please select a valid image file.', 'error');
        return;
    }
    const reader = new FileReader();
    reader.onload = function(ev) {
        const previewImg = document.getElementById('newsPreviewImg');
        const previewDiv = document.getElementById('newsPreviewDiv');
        const uploadBox = document.getElementById('newsUploadBox');
        if (previewImg) previewImg.src = ev.target.result;
        if (previewDiv) previewDiv.style.display = 'block';
        if (uploadBox) uploadBox.style.display = 'none';
        window.selectedNewsImage = ev.target.result;
    };
    reader.readAsDataURL(file);
}

window.removeNewsImage = function() {
    const previewImg = document.getElementById('newsPreviewImg');
    const previewDiv = document.getElementById('newsPreviewDiv');
    const uploadBox = document.getElementById('newsUploadBox');
    const fileInput = document.getElementById('newsImageInput');
    if (previewImg) previewImg.src = '';
    if (previewDiv) previewDiv.style.display = 'none';
    if (uploadBox) uploadBox.style.display = 'flex';
    if (fileInput) fileInput.value = '';
    window.selectedNewsImage = null;
    window.currentNewsImageUrl = null;
};


// Navigation
window.navigateTo = function(page) {
    switch(page) {
        case 'home': window.location.href = 'admin-homepage.html'; break;
        case 'map': window.location.href = 'admin-map.html'; break;
        case 'news': break;
        case 'settings': window.location.href = 'admin-settings.html'; break;
    }
};

window.goBack = function() {
    window.location.href = 'admin-homepage.html';
};

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

