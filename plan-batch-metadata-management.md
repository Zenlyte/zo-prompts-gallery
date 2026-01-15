# Plan: Batch Metadata Management

## Open Questions
- None.

## Task Checklist
- [ ] Phase 1: Global Management UI Component
    - [ ] Add gear icon to header in `src/pages/demos/prompts-demo.tsx`
    - [ ] Implement `ManagementModal` component with `Tabs` (Categories/Tags)
    - [ ] Add listing and action buttons (Rename, Delete) for metadata items
- [ ] Phase 2: Batch Operation Logic & Conflict Handling
    - [ ] Implement `fetchPreview` logic for batch operations
    - [ ] Implement `Apply` logic with state updates
    - [ ] Create merge conflict resolution dialog ("Merge" vs "Choose Different")
    - [ ] Add success/error toast notifications for batch actions

## Phase 1: Global Management UI Component
**Affected Files:**
- `src/pages/demos/prompts-demo.tsx`: Add Gear icon and management dialog markup.

### Changes
#### `src/pages/demos/prompts-demo.tsx`
- Insert a `<Button variant="ghost" size="icon">` with a `Settings` icon next to the "Prompts Gallery" title.
- Implement the `Dialog` for management:
    - `Tabs` with "Categories" and "Tags" triggers.
    - `TabsContent` for "Categories": List current unique categories from state, each with a Pen (rename) and Trash (delete) icon.
    - `TabsContent` for "Tags": List all unique tags from state, each with Pen and Trash icons.
- Add "Empty state" for the list if no categories/tags exist.

## Phase 2: Batch Operation Logic & Conflict Handling
**Affected Files:**
- `src/pages/demos/prompts-demo.tsx`: Implement API integration and conflict UI.

### Changes
#### `src/pages/demos/prompts-demo.tsx`
- Implement `handleBatchPreview(op, from, to)`:
    - Calls `POST /api/prompts/batch/preview`.
    - If `targetExists` is true, interrupt the flow to show the Merge Conflict Dialog.
    - Otherwise, show the preview of affected files.
- Implement `handleBatchApply()`:
    - Calls `POST /api/prompts/batch/apply`.
    - On success, trigger `loadPrompts()` to refresh the entire gallery state.
    - Close the modal and show a success toast with the count of affected files.
- Implement Conflict Dialog:
    - A secondary `Dialog` or nested conditional UI that asks: "Target '[name]' already exists. Do you want to merge these items or pick a different name?"
    - Buttons: "Merge", "Choose Different", "Cancel".

### Unit Tests
- **Metadata Normalization Test**: Create a small script `scripts/test-normalization.ts` to verify that `category_rename` and `tag_rename` correctly identify case-insensitive matches (e.g., "coding" matches "Coding") and apply the "To" casing consistently.
- **Batch Transformation Test**: Mock a prompt file content and verify the `transformFrontmatter` logic in a standalone test to ensure it handles single categories and tag arrays without corrupting the markdown body.

