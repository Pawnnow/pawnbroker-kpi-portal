I will package all files tied to logins and authentication into a single downloadable zip archive placed in `/mnt/documents`.

Files to include:

**Frontend auth flow**
- `src/App.tsx` — route definitions for `/auth`, `/reset-password`, `/change-password`, and protected routes
- `src/pages/Auth.tsx` — login page (email / member number + password)
- `src/pages/ResetPassword.tsx` — password reset form
- `src/pages/ChangePassword.tsx` — forced password change screen
- `src/components/ProtectedRoute.tsx` — session check, `must_change_password` redirect, frozen-account gate
- `src/components/AdminRoute.tsx` — admin-only route wrapper
- `src/components/AccountFrozenScreen.tsx` — frozen-account UI
- `src/hooks/useUserRole.ts` — reads `user_roles` to determine admin status
- `src/hooks/useUserLocations.ts` — fetches locations for the authenticated user
- `src/integrations/supabase/client.ts` — Supabase client with auth persistence settings

**Admin user-management UI**
- `src/components/admin/CreateUserForm.tsx`
- `src/components/admin/EditUserDialog.tsx`
- `src/components/admin/UserList.tsx`
- `src/components/admin/UserListExpanded.tsx`
- `src/components/admin/EmailTemplateEditor.tsx`

**Backend edge functions**
- `supabase/functions/login-with-identifier/index.ts` — custom login by email or member number
- `supabase/functions/admin-create-user/index.ts` — admin user creation + welcome email
- `supabase/functions/admin-update-user/index.ts` — admin user updates + role changes
- `supabase/functions/admin-delete-user/index.ts` — cascading user deletion
- `supabase/functions/send-email/index.ts` — transactional email helper

**Database schema / auth plumbing**
- `supabase/migrations/20251205222554_remix_migration_from_pg_dump.sql` — `profiles` table and `handle_new_user()` trigger
- `supabase/migrations/20251219202542_3a77ac0d-8b57-489b-86d3-ead33916dc3c.sql` — `app_role` enum, `user_roles`, `has_role()`, `api_keys`
- `supabase/migrations/20251219203841_a9b483d9-7145-4fa4-8ee1-a12f9b797b85.sql` — auth trigger wiring
- `supabase/migrations/20260224213859_02f4581d-326a-4404-b988-a37641f016e6.sql` — `locations` table and RLS
- `supabase/config.toml` — Supabase project configuration

**Deliverable**
- A zip file at `/mnt/documents/auth-system-export.zip` containing the files above, preserving their directory structure, plus a `README-auth-files.md` index describing each file's purpose.

No application code changes are required.