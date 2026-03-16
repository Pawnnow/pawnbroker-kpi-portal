

# Add "Outlines" Category to Files Dropdown

**File:** `src/lib/fileCategories.ts`

Add a new `outlines` entry with no subcategories (same pattern as "Management"):

```ts
outlines: { label: "Outlines", subcategories: [] },
```

That's it — the dropdown, file browsing page, and admin upload panel all read from this single config object, so they'll pick up the new category automatically.

