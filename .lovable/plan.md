Update the `users.xlsx` artifact to include a `location_id` column for every store.

### What will change
The next version of the Excel file will add an ID column immediately after each Store Name column:
- Store 1, Store 1 Name, **Store 1 ID**
- Store 2, Store 2 Name, **Store 2 ID**
- Store 3, Store 3 Name, **Store 3 ID**

Each cell will be populated with the matching `locations.id` value from the database (empty if the user has fewer than that many stores).

### Technical details
- Regenerate the file by querying `profiles` joined with `locations`.
- Group stores by `user_id`, ordered by `store_code`.
- Emit the `location_id` alongside `store_code` and `store_name` for each slot.
- Save the new file to `/mnt/documents/users.xlsx` (overwriting the previous version).

No application code or database schema changes are required.