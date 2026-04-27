# TODO - Admin Homepage, Map, and News Management Implementation

## Steps
- [x] Step 1: Analyze existing codebase and understand patterns
- [x] Step 2: Create admin homepage (HTML + CSS + JS)
- [x] Step 3: Create admin reports map page (HTML + CSS + JS)
- [x] Step 4: Create admin news management page (HTML + CSS + JS)
- [x] Step 5: Create Supabase SQL for news table
- [x] Step 6: Verify page flows and file structure

## Files Created
1. `pages/admin/admin-homepage.html` — Admin dashboard with stats, quick actions, recent reports
2. `css/admin/admin-homepage.css` — Dashboard styles matching app design
3. `js/admin/admin-homepage.js` — Dashboard logic (auth, stats, recent reports)
4. `pages/admin/admin-map.html` — Reports map with filters and list
5. `css/admin/admin-map.css` — Map page styles
6. `js/admin/admin-map.js` — Map logic (Leaflet markers, modal, status updates)
7. `pages/admin/admin-news.html` — News management (CRUD)
8. `css/admin/admin-news.css` — News management styles
9. `js/admin/admin-news.js` — News logic (create, edit, delete)
10. `backup-sql/news-sql.txt` — SQL to create `news` table in Supabase

## Setup Instructions
1. Run the SQL from `backup-sql/news-sql.txt` in your Supabase SQL Editor to create the `news` table
2. Log in as admin — you'll be redirected to `admin-homepage.html`
3. From the dashboard, use Quick Actions to navigate to Reports Map or Manage News

## Features Implemented
- **Admin Homepage**: Stats cards (total/pending/resolved reports, users), quick action grid, recent reports list
- **Reports Map**: Leaflet map with color-coded markers (yellow=pending, green=resolved), filter tabs, scrollable report list, detail modal with status update actions, Google Maps link
- **News Management**: Category-filtered news list, create/edit modal, delete confirmation, featured badge support

