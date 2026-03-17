

## Plan: Add "Open" Option for Shared Files

Currently, the file links use the `download` attribute which forces a browser download. Since the storage bucket is public, we can simply link to the file URL without `download` to open it in a new tab.

### Changes

**`src/pages/FilesPage.tsx`**
- Add an "Open" button next to the existing "Download" button for each file
- "Open" will open the file in a new browser tab (PDFs, images, etc. will render natively; other file types may still trigger a download depending on the browser)
- Keep the existing "Download" button as-is for users who want to save locally

The two buttons will sit side by side — "Open" (with an external link icon) and "Download" (existing). No backend or database changes needed.

