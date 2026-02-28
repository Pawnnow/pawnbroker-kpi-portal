

# Simplify Email Template Editor — Plain Text Mode

## Overview
Replace the raw HTML textarea with a simple plain-text editor. You'll type your email message as regular text (with line breaks), and the system will automatically wrap it in HTML behind the scenes when saving/sending. No more seeing `<div>`, `<p>`, or any HTML tags.

## What Changes

### `src/components/admin/EmailTemplateEditor.tsx`
- **Remove** the "Body (HTML)" label — rename to just "Body" or "Message"
- **Remove** the HTML preview toggle (Edit/Preview button) since there's no HTML to preview
- **Convert on load**: When the template loads from the database, strip HTML tags to show plain text (e.g., `<p>Hello</p>` becomes `Hello`)
- **Convert on save**: When saving, automatically wrap each line in `<p>` tags so the email still renders nicely
- **Remove** the `font-mono text-xs` styling from the textarea — use normal text styling instead
- **Remove** the `<div>...</div>` placeholder — use something like `"Type your welcome message here..."`
- Keep everything else the same: subject field, placeholders, attachment upload, save button

### How the conversion works
- **Load (HTML to plain text)**: Strip tags, convert `<br>` and `</p>` to newlines
- **Save (plain text to HTML)**: Split by newlines, wrap non-empty lines in `<p>` tags

## Technical Details

### Helper functions added to the component
```text
htmlToPlainText(html) — strips tags, normalizes whitespace
plainTextToHtml(text) — wraps lines in <p> tags
```

### No database changes needed
The `body_html` column still stores HTML — the conversion happens purely in the UI component.

### No edge function changes needed
The edge function already reads `body_html` and sends it as HTML to Resend — that continues to work as-is.
