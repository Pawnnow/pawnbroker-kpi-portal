# PawnMate Split + Backup Extractor Upload

## What changes for users

Each account gets a software setting chosen by an admin: **PawnMate** or **Other**.

- **Other** (everyone today, and the default): the upload page stays exactly as it is — Basic and Advanced tabs.
- **PawnMate**: the upload page becomes two tabs instead:
  1. **Backup Upload** — pick your PawnMate backup file (.zip or .tar, password-protected files supported), pick the month and store(s), and the system reads the file and fills in every KPI it can calculate on its own.
  2. **Other Required** — the handful of numbers that can't be pulled from the backup, entered by hand.

## The "Other Required" tab

Three sections:

- **New Google Reviews** (a count)
- **Income** — Beginning Cash, Misc Income, Custom Income 1-3
- **Monthly Expenses** (laid out as two side-by-side columns to keep it compact) — Executive Wages, Staff Wages, Payroll Tax - FICA, Payroll Tax - FUTA/SUTA, Medical Insurance, Liability Insurance, Other Insurance, Rent, Utilities - Phone, Utilities - Cable/Internet, Utilities - Water, Utilities - Gas/Electric, Marketing - Print, Marketing - Text/SMS, Marketing - Social Media, Marketing - Online/Digital Ads, Marketing - TV/Radio, Maintenance & Repairs, Travel, Meals & Entertainment, Office Supplies, Professional Fees (Legal/Accounting), Bank & Credit Card Fees, Misc Expense, Custom Expense 1-5

All Income and Expense fields are dollar amounts. None of them are marked mandatory — nothing on this tab blocks a submission.

The eight **Custom Income / Custom Expense** slots are renameable: the user types their own name for the slot (for example "Alarm Monitoring"), it is remembered for their account across every month, and that name is what appears in exports. Unrenamed slots keep their default names.

If the user has already saved values for the chosen store and month, the tab opens with those values filled in so they can edit rather than re-enter.

## Backup Upload tab

- Choose file, optional password box (only appears if the file turns out to be protected), month selection (most recent closed month by default, or pick a specific month), and the stores on the account.
- A live progress bar and running log while it reads the file.
- A preview of what was extracted, then a Save button that writes the values into the same place manual entries go — so dashboards, "My Entries", and exports all keep working unchanged.
- Clear messages for the two common failures: file needs a password, or the password is wrong.

## Admin

The user edit and create screens get a **Software** picker (PawnMate / Other), and the user list shows which one each account is on. Existing accounts are all set to Other.

---

## Technical notes

**Database migration**
- `profiles.software_platform text not null default 'other'` with a check constraint of `('pawnmate','other')`.
- New table `public.user_field_labels` (`user_id`, `field_name`, `label`, timestamps, unique on user+field) with grants for `authenticated`/`service_role`, RLS scoped to `auth.uid() = user_id`, plus admin read via `has_role`. Backs the renameable custom slots.
- Insert the new `kpi_field_config` rows: `new_google_reviews` already exists; add `beginning_cash`, `misc_income`, `custom_income_1..3` under category `income`, and the 29 expense fields under category `expenses` (`exec_wages`, `staff_wages`, `payroll_tax_fica`, `payroll_tax_futa_suta`, ... `custom_expense_1..5`). All `is_visible = true`, `is_required = false`, `column_group` set to new groups `income` and `monthly_expenses`. These groups are excluded from the existing Other-user Basic/Advanced columns so nothing changes for them.

**Frontend**
- Copy the `kpiExtractor/` folder into `src/lib/kpiExtractor/` and add the `@zip.js/zip.js` dependency. `writeToDb.ts`'s supabase import path already matches this project.
- New `src/hooks/useSoftwarePlatform.ts` reading `profiles.software_platform`.
- `src/pages/KpiUpload.tsx` branches on platform: existing Basic/Advanced render path untouched for `other`; for `pawnmate` it renders a new `PawnmateUpload` tab set.
- New components: `src/components/kpi/BackupExtractorTab.tsx` (file/password/month/store form, progress, log, preview, save via `writeKpiEntries`) and `src/components/kpi/OtherRequiredTab.tsx` (the manual fields, reusing `KpiInputColumn` plus an editable-label variant for the custom slots).
- Prefill: query `kpi_entries` for the selected user/location/year/month and seed the Other Required form state.
- `useKpiFieldConfig` gains the `income` / `monthly_expenses` column groups; `FieldVisibilityManager` lists them as two additional collapsible groups so admins can still hide fields.
- `src/components/admin/EditUserDialog.tsx` and `CreateUserForm.tsx` get the Software select; `admin-update-user` / `admin-create-user` edge functions persist it.

**Assumption to confirm during build:** the previously discussed Tax Exempt Sales, Online Sales and Sales Tax Collected fields are produced by the extractor for PawnMate users; they are not part of this Other Required tab.
