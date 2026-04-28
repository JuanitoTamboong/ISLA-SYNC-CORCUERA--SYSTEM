# Fix Admin Notification Design & Content

## Steps
- [x] 1. Identify issues: broken HTML in `renderNotifications()` and missing reporter name in notification content
- [x] 2. Edit `js/admin/admin-homepage.js`:
  - Added `reporterName` to notification data in `loadNotifications()`
  - Fixed missing closing `</div>` in `renderNotifications()` HTML template
  - Updated title to show reporter name
  - Updated message to show `Category • Description • time`
- [x] 3. Edit `css/admin/admin-homepage.css`:
  - Added `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` to `.notif-content p` and `.notif-content span`
- [x] 4. Verify changes

