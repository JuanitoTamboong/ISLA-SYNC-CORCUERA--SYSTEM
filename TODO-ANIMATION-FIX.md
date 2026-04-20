# Fix Animation Delay - People Icon Follow Route Sync

## Status: PENDING IMPLEMENTATION

**Issue:** People icon starts after route line completes (separate sequential calls).

**Plan:**
1. Replace `animateLine()` + `animatePeopleAlongRoute()` with single `animateSyncedRoute(coordinates)`
2. Single progress loop: line drawing + icon movement simultaneous
3. 15ms ticks, smooth interpolation
4. Preserve rotation/celebration

**After:** Perfect sync - icon follows line in real-time.

