

# Add Member Number to Account System and Update Login/Email

## 1. Add `member_number` Column to Profiles Table

Add a new `member_number` text column to the `profiles` table so each user can have a unique member number assigned during account creation.

**Database migration:**
- Add `member_number TEXT` column to `profiles` (nullable, unique)

## 2. Update Account Creation

### CreateUserForm.tsx
- Add a "Member Number" input field to the form (required)
- Include `member_number` in the request body sent to `admin-create-user`
- Show Member Number in the success confirmation card and copy-credentials text

### admin-create-user Edge Function
- Accept `member_number` in the request body
- Validate it (non-empty, check for uniqueness in profiles)
- Save it to the profile alongside other fields
- Pass `member_number` to the welcome email function as a placeholder

### EditUserDialog.tsx
- Add a "Member Number" field so admins can view/edit it

## 3. Update Login to Accept Email or Member Number

### Auth.tsx (Login Page)
- Change the label from "Username or Email" to "Email or Member Number"
- Update placeholder text accordingly

### login-with-identifier Edge Function
- Currently checks if identifier contains "@" to distinguish email vs username
- Update the non-email branch to look up by `member_number` instead of `user_name`
- Query: `SELECT email FROM profiles WHERE member_number = identifier`

## 4. Update Email Template Placeholders

### EmailTemplateEditor.tsx
- Add `{{member_number}}` to the PLACEHOLDERS array (with desc "Member number")
- The existing `{{full_name}}` and `{{user_name}}` placeholders remain available for template authors

### admin-create-user Edge Function (sendWelcomeEmail)
- Add `member_number` replacement in the `replacePlaceholders` function: `{{member_number}}` maps to the member number value

### Default Template Content (database update)
- Update the existing welcome template body to use `{{full_name}}` after "Hello" instead of `{{user_name}}`
- Add a "Member Number: `{{member_number}}`" line below the email line in the template

*Note: The actual template content is stored in the database. An admin will need to manually update the template text via the editor, or we can update it via a data change. I'll update it via a data operation.*

---

## Technical Summary

| File / Resource | Change |
|---|---|
| Database migration | Add `member_number` text column (unique) to `profiles` |
| Database data update | Update welcome email template body |
| `src/components/admin/CreateUserForm.tsx` | Add Member Number input field |
| `src/components/admin/EditUserDialog.tsx` | Add Member Number field |
| `src/components/admin/EmailTemplateEditor.tsx` | Add `{{member_number}}` placeholder |
| `src/pages/Auth.tsx` | Change label to "Email or Member Number" |
| `supabase/functions/login-with-identifier/index.ts` | Look up by `member_number` instead of `user_name` |
| `supabase/functions/admin-create-user/index.ts` | Accept, validate, save `member_number`; add to email placeholders |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

