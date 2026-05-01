# TODO: Manage Tourist Spots Feature

## Task: Add "Manage Tourist Spots" in Admin Quick Actions with souvenir management

### Files to Create:
1. [ ] pages/admin/admin-tourist-spots.html - Admin page for managing tourist spots
2. [ ] js/admin/admin-tourist-spots.js - CRUD logic for tourist spots and souvenirs
3. [ ] css/admin/admin-tourist-spots.css - Styling for the admin tourist spots page
4. [ ] backup-sql/tourist-spots-sql.txt - SQL queries for database setup

### Files to Edit:
1. [ ] pages/admin/admin-homepage.html - Add "Manage Tourist Spots" card in Quick Actions
2. [ ] js/admin/admin-homepage.js - Add navigation function goToTouristSpots()

### Implementation Details:

#### Quick Actions (admin-homepage.html):
- Add new action-card similar to Manage News
- Icon: fa-landmark or fa-map-location-dot
- Text: "Manage Tourist Spots"
- Subtext: "Add spots & souvenirs"

#### Tourist Spots Management (similar to Manage News):
- Filter tabs: All, Beaches, Landmarks, Souvenirs
- Card list showing tourist spots
- Modal form with fields:
  - Name
  - Category (Beach, Landmark)
  - Description
  - Location
  - Image
  - Visibility toggle

#### Souvenir Management (inside Tourist Spot modal or sub-section):
- When a tourist spot is selected/created, add ability to add souvenirs
- Souvenir fields:
  - Name
  - Description
  - Price (PHP currency)
  - Image
  - Associated Tourist Spot (dropdown)

#### Database Structure:
- tourist_spots table
- souvenirs table (with foreign key to tourist_spots)

### Status:
- [x] Planning/Analysis Complete
- [x] Awaiting User Confirmation
- [x] Implementation Started

## Implementation Progress:

### Step 1: SQL Database Structure
- [x] Create backup-sql/tourist-spots-sql.txt

### Step 2: New Admin Page Files
- [x] Create pages/admin/admin-tourist-spots.html (already existed)
- [x] Create css/admin/admin-tourist-spots.css (already existed)
- [x] Create js/admin/admin-tourist-spots.js (just created)

### Step 3: Edit Admin Homepage
- [ ] Edit pages/admin/admin-homepage.html - Add Quick Action card
- [ ] Edit js/admin/admin-homepage.js - Add navigation function

### Step 4: Testing
- [ ] Verify all files work correctly
