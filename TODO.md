# TODO - Admin Tourist Spots (JS + Design Fix)

- [x] Read current admin tourist spots JS/HTML/CSS.
- [x] Fix JS crash: remove references to non-existent driver fields in `saveSpot()`.
- [x] Fix spot-card design inconsistency: remove driver preview fields from spot cards (drivers are handled in `tourist_spot_drivers`).
- [x] Fix CSS conflict: scope `.souvenir-item` styling to `#souvenirGrid` to avoid overriding inline souvenir styles on spot cards.
- [ ] Quick manual test:
  - [ ] Open `pages/admin/admin-tourist-spots.html`
  - [ ] Add/edit a spot (save works)
  - [ ] Add/edit/delete drivers via Driver modal
  - [ ] Add/edit/delete souvenirs via Souvenir modal
  - [ ] Filter tabs re-render correctly

