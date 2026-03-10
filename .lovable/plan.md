

# Comprehensive Update Package

This plan bundles all discussed changes into a single implementation.

---

## 1. Files Repository — Database & Storage

**New `shared_files` table** storing file metadata (category, subcategory, filename, storage path, uploaded_by, created_at). RLS: all authenticated users can SELECT; only admins can INSERT/DELETE.

**New `shared-files` storage bucket** (public). Storage RLS: authenticated can read; admins can upload/delete.

## 2. Files Dropdown in Header

**New component: `src/components/FilesDropdown.tsx`**
- DropdownMenu button labeled "Files" with folder icon.
- Top-level items: "Marketing" (submenu with Facebook, Google, Website, Other) and "Management" (direct link).
- Each leaf navigates to `/files/:category/:subcategory?`.

**Added to headers** in both `KpiUpload.tsx` (~line 708) and `ClientDashboard.tsx` (~line 417).

## 3. Files Browsing Page

**New page: `src/pages/FilesPage.tsx`**
- Protected route at `/files/:category/:subcategory?` registered in `App.tsx`.
- Queries `shared_files` filtered by URL params.
- Breadcrumb navigation and download links via public storage URL.

## 4. Admin File Upload Panel

**New component: `src/components/admin/SharedFileManager.tsx`**
- Added to `AdminDashboard.tsx` after the LocationManager section (~line 412).
- File input picker for local files.
- Cascading dropdowns: Category (Marketing/Management) → Subcategory (only shown for Marketing: Facebook/Google/Website/Other).
- Upload button stores file in bucket at `{category}/{subcategory}/{filename}` and inserts metadata row.
- Table of existing files with delete capability.

Category config as a shared constant:
```typescript
const FILE_CATEGORIES = {
  marketing: { label: "Marketing", subcategories: ["Facebook", "Google", "Website", "Other"] },
  management: { label: "Management", subcategories: [] },
};
```

## 5. KPI Upload Portal Header Changes (`src/pages/KpiUpload.tsx`)

- **Rename** "My Entries" button (line 717) → "User Dashboard".
- **Remove** "Export Excel" button and its associated state/logic (lines 725-728 and related `exportDialogOpen`/`isExporting` code).

## 6. KPI Submission Confirmation Dialogs (`src/pages/KpiUpload.tsx`)

Replace immediate submission with a two-step dialog flow:

- **New state**: `confirmDialogOpen`, `successDialogOpen`, `pendingFilledCount`, `pendingBlankCount`.
- **On Submit click**: after existing validation, count filled vs blank fields across all value maps (pawn, merchandise, marketing, aged inventory, pawn balance). Open pre-submission `AlertDialog`:
  > "You are uploading **X** values and leaving **Y** values blank. Please confirm your submission."
  > [Cancel] [Confirm]
- **On Confirm**: execute the existing upload logic (renamed to `executeSubmit`).
- **On success**: close confirmation dialog, open success `AlertDialog`:
  > "**X** values uploaded. You may edit your entries at any time in the User Dashboard."
  > [OK]

## 7. Client Dashboard Tab Rename (`src/pages/ClientDashboard.tsx`)

- Line 441: Change the first tab label from "Dashboard" to "My Entries" (the entries editor tab).
- Line 445: The second tab remains "Dashboard" (charts tab).

---

## Summary of Files Changed

| File | Changes |
|------|---------|
| **Migration SQL** | Create `shared_files` table, `shared-files` bucket, RLS policies |
| `src/components/FilesDropdown.tsx` | New — dropdown menu component |
| `src/pages/FilesPage.tsx` | New — file browsing page |
| `src/components/admin/SharedFileManager.tsx` | New — admin upload panel |
| `src/App.tsx` | Add `/files/:category/:subcategory?` route |
| `src/pages/KpiUpload.tsx` | Add FilesDropdown, rename button, remove Export Excel, add confirmation dialogs |
| `src/pages/ClientDashboard.tsx` | Add FilesDropdown, rename tab to "My Entries" |
| `src/pages/AdminDashboard.tsx` | Add SharedFileManager component |

