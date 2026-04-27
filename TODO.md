# TODO: Change Resident News Notification & Remove Samples

## Steps
- [ ] 1. Update `pages/news.html` — remove all hardcoded sample cards, add dynamic loading containers, update script src to `../js/notif.js`
- [ ] 2. Rewrite `js/notif.js` — add Supabase client, load real news from `news` table, render dynamically with filters & featured section, remove sample data
- [ ] 3. Update `js/resident-homepage.js` — change `viewNews()` to navigate to `../pages/news.html`; update `navigateTo('notifications')` to point to `news.html`
- [ ] 4. Update `js/map.js` — change `notifications` nav URL from `notif.html` to `news.html`
- [ ] 5. Update `js/setting.js` — change `notifications` nav URL from `notif.html` to `news.html`

