# Fix Cross-Login Logout Bug

## Planned Steps:
- [x] Step 1: Edit js/login.js - Remove localStorage.removeItem('currentAdmin')\n- [x] Step 2: Edit js/admin-login.js - Remove localStorage.removeItem('currentUser')  \n
- [ ] Step 3: Test resident login doesn't clear admin session
- [ ] Step 4: Test admin login doesn't clear resident session
- [ ] Step 5: Verify protected pages still enforce role checks
- [ ] Step 6: Complete task
