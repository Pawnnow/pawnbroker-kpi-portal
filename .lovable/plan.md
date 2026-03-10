

# Reorder Admin Dashboard: Move Shared File Manager Above Email Template

Swap the two components in `src/pages/AdminDashboard.tsx` (lines ~405-416):

**Before:**
```
<EmailTemplateEditor />
<FieldVisibilityManager ... />
<SharedFileManager />
```

**After:**
```
<SharedFileManager />
<EmailTemplateEditor />
<FieldVisibilityManager ... />
```

Single change in one file — just moving the `<SharedFileManager />` block above `<EmailTemplateEditor />`.

