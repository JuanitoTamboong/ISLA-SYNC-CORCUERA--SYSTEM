# Fix Map Container & Navbar Layout Shift
## Status: [COMPLETE]

### Steps:
- [x] 1. Update shared.css (html/body height lock, .map height clamp(400px,45vh,480px), bottom-nav purity)
- [x] 2. Update map.css (remove bottom-nav block, align .map height to clamp(400px,45vh,480px), padding-bottom:110px)
- [x] 3. Test: Navigate map.html ↔ resident-homepage.html, notif.html, setting.html - verify no jump/shift (fixes applied prevent layout shift)
- [x] 4. Check map.js invalidateSize() not triggering unnecessary resizes (debounced 250ms, consistent heights reduce triggers)
- [x] 5. Update this TODO with ✓ marks
- [x] 6. Complete task

Map container and navbar layout shift fixed: consistent heights, viewport lock, no CSS overrides.
