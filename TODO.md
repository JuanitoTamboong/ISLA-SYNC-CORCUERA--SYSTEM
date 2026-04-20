# Route Enhancement TODO
## Approved Plan Steps

### [x] 1. Enhance CSS styles ✅
- Add .start-pin, .dest-pin gradients + icons
- Add .people-icon styles (orange pulsing)
- Update .pin base

### [x] 2. Update JS markers in createMap() ✅
- Start: blue gradient + fa-location-dot
- Dest: green gradient + fa-flag-checkered

### [x] 3. Add moving people icon ✅
- Global fullCoordinates, peopleMarker
- In animateLine: store as LatLngs
- In animationComplete(): orange fa-users follows route (12s), GPS clears

### [ ] 2. Update JS markers in createMap()
- Start: blue gradient + fa-location-dot
- Dest: green gradient + fa-flag-checkered

### [ ] 3. Add moving people icon
- Global fullCoordinates
- In animateLine: store coordinates
- In animationComplete(): create peopleMarker (fa-users), animate along path

### [ ] 4. Polish & clean
- Update GPS refresh markers
- Button states
- Responsive icons

### [ ] 5. Test complete flow
- Map → place → directions → Draw → new pins + moving people

Progress: 0/5

