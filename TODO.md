# TODO - Tourist Spots Admin Fix

- [x] Update `backup-sql/tourist-spots-sql.txt` to a safe, re-runnable ALTER-based migration:
  - [x] Ensure `tourist_spots` has `driver_name` + `driver_contact_number`
  - [x] Ensure `tourist_spots` has no `description` column
  - [x] Ensure `souvenirs` has no `description` column
  - [x] Keep/create RLS policies + grants
  - [x] Keep/create triggers for `updated_at`
  - [x] Keep/create helper functions `check_is_admin` and `update_updated_at_column`
- [ ] After applying SQL in Supabase, refresh admin pages and verify CRUD works


