# TODO: Fix News Container Design

## Issues
- News cards overlap on small screens
- Mobile view breaks with long titles/content
- Featured section too tall on mobile
- Filter pills overflow on small screens

## Plan
1. Fix `.news-card > div` overflow and text wrapping
2. Add text truncation to `.news-card h4`
3. Improve mobile breakpoints (480px and 360px)
4. Reduce featured section height on mobile
5. Adjust filter pill sizing for mobile
6. Add bottom padding to news container

## Progress
- [x] Create TODO
- [x] Edit css/news.css
- [x] Test responsive layout

## Completed
All changes applied to `css/news.css`:
- Added `overflow: hidden` and flex column layout to `.news-card > div`
- Added `-webkit-line-clamp: 2` and `word-break: break-word` to `.news-card h4`
- Added `align-self: flex-start` to `.tag`
- Added `margin-top: auto` to `.date` for consistent spacing
- Added `#newsContainer` padding-bottom
- Enhanced `@media (max-width: 480px)` with smaller fonts, padding, and image sizes
- Added new `@media (max-width: 360px)` breakpoint for very small screens
- Reduced featured section height on mobile (160px → 140px)

