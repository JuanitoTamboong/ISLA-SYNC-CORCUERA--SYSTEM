// Wait for DOM and Supabase to load
document.addEventListener('DOMContentLoaded', function() {
    if (typeof supabase === 'undefined') {
        showNotification('Error: Supabase SDK failed to load. Please refresh the page.', 'error');
        return;
    }
    
    const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co'
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds'
    
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    const currentUser = localStorage.getItem('currentUser')
    
    if (!currentUser) {
        window.location.href = '../pages/login.html'
        return
    }
    
    let user;
    try {
        user = JSON.parse(currentUser)
        if (!user || !user.id) {
            localStorage.removeItem('currentUser')
            window.location.href = '../pages/login.html'
            return
        }
    } catch (e) {
        localStorage.removeItem('currentUser')
        window.location.href = '../pages/login.html'
        return
    }
    
    if (user.userType === 'admin') {
        window.location.href = '../pages/admin/admin-homepage.html';
        return;
    }
    
    async function verifySession() {
        try {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
            
            if (sessionError || !session) {
                localStorage.removeItem('currentUser')
                window.location.href = '../pages/login.html'
                return false
            }
            
            if (session.user.id !== user.id) {
                localStorage.removeItem('currentUser')
                window.location.href = '../pages/login.html'
                return false
            }
            
            return true
        } catch (error) {
            return false
        }
    }
    
    async function loadUserData() {
        try {
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle()
            
            if (profileError) {
                updateUserInterface(user)
                return
            }
            
            if (profile) {
                user = {
                    ...user,
                    fullName: profile.full_name,
                    email: profile.email,
                    userType: profile.user_type,
                    is_active: profile.is_active,
                    photo: profile.avatar_url
                }
                localStorage.setItem('currentUser', JSON.stringify(user))
                
                if (!profile.is_active) {
                    showNotification('Your account has been deactivated.', 'error')
                    setTimeout(() => logout(), 2000)
                    return
                }
                
                updateUserInterface(user)
                updateProfileImage(user)
                updateGreeting()
            }
        } catch (error) {
            updateUserInterface(user)
        }
    }
    
    updateProfileImage(user)

    async function loadCommunityUpdates() {
        try {
            const { data: newsData, error } = await supabaseClient
                .from('news')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);

            if (error) {
                console.error('Load community updates error:', error);
                return;
            }

            const updatesContainer = document.getElementById('communityUpdates');
            if (!updatesContainer) return;

            if (!newsData || newsData.length === 0) return;

            const categoryThemes = {
                'Advisory': 'blue',
                'Tourism': 'purple',
                'Events': 'orange',
                'Community': 'green'
            };

            const categoryIcons = {
                'Advisory': 'fa-bullhorn',
                'Tourism': 'fa-map-location-dot',
                'Events': 'fa-calendar-days',
                'Community': 'fa-users'
            };

            const html = newsData.map(news => {
                const icon = categoryIcons[news.category] || 'fa-bullhorn';
                const themeClass = categoryThemes[news.category] || 'blue';

                const shortTitle = news.title.length > 40 
                    ? news.title.substring(0, 40) + '...' 
                    : news.title;

                return `
                    <div class="update-card ${themeClass}" onclick="window.location.href='../pages/news.html'" style="cursor: pointer;">
                        <div class="update-icon ${themeClass}">
                            <i class="fa ${icon}"></i>
                        </div>
                        <div class="update-text">
                            <p class="title">${escapeHtml(news.category || 'Update')}</p>
                            <span>${escapeHtml(shortTitle)}</span>
                        </div>
                    </div>
                `;
            }).join('');


            updatesContainer.innerHTML = html;

        } catch (error) {
            console.error('Community updates error:', error);
        }
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    verifySession().then(isValid => {
        if (isValid) {
            loadUserData().then(() => {
                loadCommunityUpdates();
            });
        }
    });
    
    const bannerImages = [
        '../assets/generate background image of corquera romblon.jpg',
        '../assets/generate background image of corquera romblon (1).jpg',
        '../assets/generate background image of corquera romblon (2).jpg',
        '../assets/generate background image of corquera romblon sea-7.jpg',
        '../assets/generate background of corquera romblon.jpg',
        '../assets/generate background of corquera romblon (1).jpg',
        '../assets/generate background of corquera romblon (2).jpg',
        '../assets/7.jpg',
        '../assets/sea.jpg',
    ];
    
    let currentImageIndex = 0;
    
    function shuffleBanner() {
        const bannerImg = document.querySelector('.banner img');
        if (bannerImg) {
            bannerImg.src = bannerImages[currentImageIndex];
            currentImageIndex = (currentImageIndex + 1) % bannerImages.length;
        }
    }
    
    setTimeout(() => {
        shuffleBanner();
        setInterval(shuffleBanner, 4000);
    }, 2000);
    
    function updateUserInterface(user) {
        const userNameElement = document.getElementById('userName')
        if (userNameElement) {
            userNameElement.textContent = user.fullName
        }
        updateProfileImage(user)
    }

    function updateProfileImage(user) {
        const img = document.getElementById('profileImg')
        const icon = document.getElementById('profileIcon')
        if (!img || !icon) return

        img.style.display = 'none'
        icon.style.display = 'block'

        if (user.photo && user.photo.trim()) {
            img.src = user.photo
            img.style.display = 'block'
            icon.style.display = 'none'
            img.onerror = () => {
                img.style.display = 'none'
                icon.style.display = 'block'
            }
        }
    }
    
    function updateGreeting() {
        const greetingElement = document.getElementById('greetingText')
        if (!greetingElement) return
        
        const hour = new Date().getHours()
        let greeting = ''
        
        if (hour < 12) greeting = 'Good Morning,'
        else if (hour < 18) greeting = 'Good Afternoon,'
        else greeting = 'Good Evening,'
        
        greetingElement.textContent = greeting
    }
    
    window.viewProfile = function() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'))
        showNotification(`Name: ${currentUser.fullName}\nEmail: ${currentUser.email}`, 'info')
        closeModal()
    }
    
    window.changePassword = async function() {
        const currentPassword = prompt('Enter your current password:')
        if (!currentPassword) return
        
        const newPassword = prompt('Enter your new password (min 6 characters):')
        if (!newPassword || newPassword.length < 6) {
            showNotification('Password must be at least 6 characters', 'error')
            return
        }
        
        const confirmPassword = prompt('Confirm your new password:')
        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match', 'error')
            return
        }
        
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'))
            const { error: signInError } = await supabaseClient.auth.signInWithPassword({
                email: currentUser.email,
                password: currentPassword
            })
            
            if (signInError) {
                showNotification('Current password is incorrect', 'error')
                return
            }
            
            const { error } = await supabaseClient.auth.updateUser({
                password: newPassword
            })
            
            if (error) {
                showNotification(error.message, 'error')
            } else {
                showNotification('Password updated successfully!', 'success')
            }
        } catch (error) {
            showNotification('Error updating password', 'error')
        }
        
        closeModal()
    }
    
    window.logout = async function() {
        try {
            localStorage.removeItem('currentUser')
            await supabaseClient.auth.signOut()
            showNotification('Logged out successfully', 'success')
            setTimeout(() => {
                window.location.href = '../pages/login.html'
            }, 1000)
        } catch (error) {
            showNotification('Error logging out', 'error')
        }
    }
    
    function closeModal() {
        const modal = document.querySelector('.profile-modal')
        if (modal) modal.remove()
    }
    
    window.navigateTo = function(page) {
        switch(page) {
            case 'home':
                window.location.href = '../pages/resident-homepage.html'
                break
            case 'map':
                window.location.href = '../pages/map.html'
                break
            case 'notifications':
                window.location.href = '../pages/news.html'
                break
            case 'profile':
                window.location.href = '../pages/profile.html'
                break
            case 'settings':
                window.location.href = '../pages/setting.html'
                break
        }
    }
    
    window.reportIssue = () => { window.location.href = '../pages/report.html'; }
    window.viewNews = () => { window.location.href = '../pages/news.html'; }
window.viewTouristSpots = () => { window.location.href = '../pages/tourist-spot.html'; }
    window.viewMyReports = () => { window.location.href = '../pages/view-reports.html'; }

    // ========== NOTIFICATION SYSTEM ==========
    let notifications = [];
    let notifReadIds = JSON.parse(localStorage.getItem('notifReadIds') || '[]');

    async function loadNotifications() {
        try {
            const { data: reports, error } = await supabaseClient
                .from('reports')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error || !reports) return;

            notifications = [];

            reports.forEach(report => {
                const createdDate = new Date(report.created_at);
                const dateStr = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                // Only admin status update notifications (skip self-submitted)
                if (report.status && report.status.toLowerCase() !== 'pending') {
                    const statusText = report.status.toUpperCase().replace('_', ' ');
                    let statusMessage = '';
                    let iconColor = 'orange';

                    if (report.status.toLowerCase() === 'resolved') {
                        statusMessage = `Your report ${report.reference || ''} has been resolved.`;
                        iconColor = 'green';
                    } else if (report.status.toLowerCase() === 'in_review' || report.status.toLowerCase() === 'in-review') {
                        statusMessage = `Your report ${report.reference || ''} is now under review.`;
                        iconColor = 'orange';
                    } else {
                        statusMessage = `Your report ${report.reference || ''} status updated to ${statusText}.`;
                    }

                    notifications.push({
                        id: `status-${report.id}`,
                        reportId: report.id,
                        title: 'Status Update',
                        message: statusMessage,
                        time: dateStr,
                        icon: 'fa-rotate',
                        iconColor: iconColor,
                        read: notifReadIds.includes(`status-${report.id}`)
                    });
                }
            });

            renderNotifications();
        } catch (e) {
            console.error('Load notifications error:', e);
        }
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
                    <p>No new notifications</p>
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
                    <span>${escapeHtml(notif.message)} &bull; ${notif.time}</span>
                </div>
        `).join('');
    }

    window.handleNotifClick = function(event, notifId, reportId) {
        event.stopPropagation();

        if (!notifReadIds.includes(notifId)) {
            notifReadIds.push(notifId);
            localStorage.setItem('notifReadIds', JSON.stringify(notifReadIds));
        }
        const notif = notifications.find(n => n.id === notifId);
        if (notif) notif.read = true;

        const notificationPanel = document.getElementById('notificationPanel');
        if (notificationPanel) notificationPanel.classList.remove('show');

        renderNotifications();

        setTimeout(() => {
            window.location.href = '../pages/view-reports.html';
        }, 150);
    };

    window.markAllRead = function() {
        notifications.forEach(n => {
            if (!notifReadIds.includes(n.id)) {
                notifReadIds.push(n.id);
            }
            n.read = true;
        });
        localStorage.setItem('notifReadIds', JSON.stringify(notifReadIds));
        renderNotifications();
    };

    const notificationBell = document.getElementById('notificationBell');
    const notificationPanel = document.getElementById('notificationPanel');

    if (notificationBell && notificationPanel) {
        notificationBell.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationPanel.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!notificationBell.contains(e.target)) {
                notificationPanel.classList.remove('show');
            }
        });
    }

    verifySession().then(isValid => {
        if (isValid) {
            loadUserData().then(() => {
                loadCommunityUpdates();
                loadNotifications();
            });
        }
    });

    // ========== NOTIFICATION SYSTEM END ===========

    function showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.notification')
        if (existingNotification) existingNotification.remove()
        
        const notification = document.createElement('div')
        notification.className = `notification ${type}`
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `
        
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
            white-space: pre-line;
        `
        
        document.body.appendChild(notification)
        
        setTimeout(() => {
            if (notification && notification.parentNode) notification.remove()
        }, 4000)
    }
})
