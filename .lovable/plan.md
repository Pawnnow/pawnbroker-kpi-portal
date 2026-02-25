

# Customizable Welcome Email with Attachment Support

## Overview
Add an admin UI to customize the welcome email template (subject, body text, optional file attachment) that gets sent when a new user account is created. The current email is hardcoded in the edge function -- this change moves the template to the database so you can edit it from the admin dashboard without touching code.

## How It Works
1. A new "Welcome Email Template" card appears on the Admin Dashboard (near the Create User form)
2. You can edit the email subject, body text (with placeholder variables like `{{user_name}}`, `{{email}}`, `{{password}}`), and optionally upload a PDF or image attachment
3. When you create a new user, the edge function reads your saved template from the database and sends it with any attachment
4. A preview section shows what the email will look like before saving

## Database Changes

### New Table: `email_templates`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Auto-generated |
| template_type | text (unique) | e.g., "welcome" -- allows future template types |
| subject | text | Email subject line |
| body_html | text | HTML body with placeholder variables |
| attachment_url | text (nullable) | Public URL to a file in storage |
| attachment_filename | text (nullable) | Original filename for the attachment |
| updated_at | timestamptz | Auto-updated |
| updated_by | uuid (FK to profiles) | Who last edited |

### RLS Policies
- Admins can SELECT, INSERT, UPDATE on `email_templates`
- No public access

### Storage Bucket: `email-attachments`
- Public bucket for storing PDF/image attachments
- RLS: Public SELECT (so Resend can fetch the file), admin-only INSERT/UPDATE/DELETE

### Seed Data
- Insert a default "welcome" template row with the current hardcoded email content so nothing breaks immediately

## New Files

### `src/components/admin/EmailTemplateEditor.tsx`
- Card component with:
  - Subject input field
  - Rich text area for HTML body (simple textarea with preview, not a full WYSIWYG)
  - List of available placeholders: `{{user_name}}`, `{{email}}`, `{{password}}`, `{{full_name}}`
  - File upload button for attachment (PDF, PNG, JPG -- max 5MB)
  - "Preview" toggle to see rendered HTML
  - "Save Template" button
  - Status indicator showing when template was last saved

## Modified Files

### `src/pages/AdminDashboard.tsx`
- Import and render `EmailTemplateEditor` component (near the Create User form)

### `supabase/functions/admin-create-user/index.ts`
- Instead of hardcoded HTML, fetch the "welcome" template from `email_templates` table
- Replace placeholder variables (`{{user_name}}`, `{{email}}`, `{{password}}`, `{{full_name}}`) with actual values
- If an `attachment_url` is set, fetch the file and include it as a Resend attachment
- Fall back to the current hardcoded template if no database template exists (safety net)

## Technical Details

### Placeholder Replacement
The edge function will do simple string replacement:
```text
{{user_name}}  --> the new user's username
{{email}}      --> the new user's email
{{password}}   --> the temporary password
{{full_name}}  --> the new user's full name (or empty string)
```

### Attachment Handling
- Admin uploads a file via the UI to the `email-attachments` storage bucket
- The public URL is saved in `email_templates.attachment_url`
- When sending the email, the edge function fetches the file from the URL and includes it as a Resend attachment using their attachments API:
```text
attachments: [{ filename: "welcome.pdf", content: base64Content }]
```

### Migration Summary
1. Create `email_templates` table with RLS policies
2. Create `email-attachments` storage bucket (public read)
3. Seed default welcome template with current hardcoded HTML
4. Storage RLS: public SELECT, admin INSERT/UPDATE/DELETE on objects

### Email Status Feedback
- After creating a user, the edge function will return `email_sent: true/false` in its response
- The CreateUserForm success card will show whether the welcome email was sent or failed

