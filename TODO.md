# TODO - Add Reporter Name to Report Data

- [x] Step 1: Update `backup-sql/user-reports-sql.txt` — Add `reporter_name` column
- [x] Step 2: Update `js/report.js` — Include `reporter_name` on submission
- [x] Step 3: Update `pages/admin/admin-map.html` + `js/admin/admin-map.js` — Show reporter name in modal
- [x] Step 4: Update `js/admin/admin-homepage.js` — Show reporter name in recent reports

**Follow-up:** Run this SQL on your live Supabase instance to add the column to the existing table:
```sql
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reporter_name TEXT;
