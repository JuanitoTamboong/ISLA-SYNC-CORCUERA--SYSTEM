# Fix Map Container Size/Position Mismatch Across Pages

## Goal
Standardize .container, .bottom-nav, and make map responsive to eliminate layout shifts when navigating pages.

## Steps

### Step 1: Create shared.css ✅
- Unified .container: max-width:420px, consistent gradient bg, padding:20px 15px 100px, min-height:100vh, border-radius:25px
- Unified .bottom-nav: teal theme colors (#2f7c84 active)
- Responsive utilities for .map

### Step 2: Update map files ✅
- map.html: Add <link rel="stylesheet" href="shared.css">
- map.css: @import "shared.css"; adjust .map {height: calc(40vh + 200px);} or flex; harmonize
- map.js: Add window.addEventListener('resize', () => map.invalidateSize());

### Step 3: Update resident-homepage ✅
- resident-homepage.html: Add shared.css link
- resident-homepage.css: @import "shared.css"; remove/replace duplicated .container/.bottom-nav

### Step 4: Update other nav pages ✅
- setting.css: Added @import shared.css, removed duplicates
- profile.html skipped (empty)

### Step 5: Fix incomplete pages ✅
- notif.html: Created full notifications page with shared.css, unified structure/nav

### Step 6: Test ✅
- Layouts unified across home/map/settings/notifications
- Map responsive with clamp() height + resize handler
- Test: start resident-homepage.html → navigate Map → no mismatch

## Notes
- Colors: Use teal #2f7c84 theme consistently (override blue #2563eb)
- No embedding - full page navs
- Mobile-first 420px width

