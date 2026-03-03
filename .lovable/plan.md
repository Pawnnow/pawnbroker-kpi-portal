

# Fix Group Label in Edit User Dialog

## Problem
The Edit User dialog still shows "Group 0" instead of "Demo" in its group dropdown, unlike the Create User form which was already fixed.

## Change

### `src/components/admin/EditUserDialog.tsx`
- Import `getGroupLabel` from `@/lib/groupLabel`
- Replace the hardcoded label `{g === 1 ? "Founders" : \`Group ${g}\`}` in the group `<SelectItem>` with `{getGroupLabel(g)}`

This is the same one-line fix already applied to `CreateUserForm.tsx`.

