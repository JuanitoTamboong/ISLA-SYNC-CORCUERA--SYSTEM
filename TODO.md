# Fix Admin Profile Container Size

## Problem
The admin profile page (`css/admin/admin-profile.css`) has inconsistent container/content sizing compared to other pages (settings, notifications, resident homepage).

## Root Causes Found
1. `.card` has `margin: 0 15px 15px` — adds extra left/right margins, making cards narrower than other pages
2. `.section-title` has `margin: 15px` — different from other pages (`15px 5px 8px`)
3. `.header` has `padding: 15px` — inconsistent with settings/notif-news headers
4. Missing responsive `@media (max-width: 480px)` container padding override

## Plan
- [x] Edit `css/admin/admin-profile.css`
  - Change `.card` margin from `0 15px 15px` to `margin-bottom: 15px`
  - Change `.section-title` margin from `15px` to `15px 5px 8px`
  - Update `.header` to match settings/notif-news style (remove padding, add margin-bottom)
  - Add responsive `@media (max-width: 480px)` container padding override

## Dependent Files
- None — only `css/admin/admin-profile.css` needs changes

