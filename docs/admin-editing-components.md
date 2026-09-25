# Admin Editing UI Foundation

These components establish the shared interaction and visual patterns for future Products, Catalog, and Users editors. They contain no Firestore or business logic.

## Accordion row

`AdminAccordionRow` renders a collection-independent summary row and an expanded editor region.

Important props:

- `id`: stable, page-unique ID used for ARIA relationships.
- `expanded`: controlled expanded state.
- `onToggle`: parent callback that requests opening or closing.
- `summary`: collapsed row content.
- `children`: editor content.
- `disabled` and `ariaLabel`: optional interaction/accessibility configuration.

The summary is one keyboard-operable row. Enter, Space, or clicking the row calls `onToggle`. Interactive descendants and elements marked `data-accordion-ignore` do not toggle the accordion, allowing future row-specific controls. Form interaction inside the editor never reaches the summary handler.

```jsx
<AdminAccordionRow
  id={`product-${product.id}`}
  expanded={accordion.openId === product.id}
  onToggle={() => accordion.toggleEditor(product.id)}
  summary={<ProductSummary product={product} />}
>
  <ProductEditor draft={draft} onChange={updateDraft} />
</AdminAccordionRow>
```

## One editor per section

`useAdminEditorAccordion` owns `{ openId, isDirty }` for one management section. Create one hook instance for Products, one for Devices, and another for Product Types. This keeps sections independent. Device-tree navigation expansion must remain in its existing, separate state.

```jsx
const confirmation = useConfirmationDialog();
const accordion = useAdminEditorAccordion({
  confirmDiscard: () => confirmation.confirm({
    title: 'Discard changes?',
    description: 'Your unsaved changes will be lost.',
    confirmLabel: 'Discard Changes',
    destructive: true,
  }),
});

<ConfirmationDialog {...confirmation.dialogProps} />
```

Opening another row or closing the current row calls `confirmDiscard` when dirty. A rejected/cancelled confirmation preserves the open editor and draft. `setDirty(true)` enables the native `beforeunload` warning. After a successful save, update the page’s original record and call `markSaved()`. On a failed save, leave the draft, errors, dirty state, and open row unchanged.

For client-side navigation, call `closeEditor()` before the navigation. It uses the same discard confirmation. The foundation intentionally does not monkey-patch router or history APIs.

## Editor actions

`AdminEditorActions` provides primary Save Changes, secondary Cancel, optional destructive Delete, and a `children` slot for actions such as Approve or Reject. It disables actions during saving and uses a synchronous submission guard so rapid clicks cannot start duplicate saves before React receives new loading props.

The parent owns the API request, validation, feedback, and permissions. `onSave` should catch request failures and preserve the draft.

## Form controls

`AdminForm.js` exports:

- `AdminField` for custom controls.
- `AdminTextInput`, `AdminTextarea`, `AdminSelect`, and `AdminNumberInput`.
- `AdminFormSection` for grouped fields.

Every control requires a stable `id`. Labels use `htmlFor`; help and validation messages are connected with `aria-describedby`; errors set `aria-invalid`. Values and validation remain controlled by the page-specific editor.

## Confirmation dialog

`ConfirmationDialog` uses the native modal dialog API, which blocks background interaction. Focus moves to Cancel, Escape cancels unless loading, and focus returns to the element that opened it. Labels, description, destructive styling, and loading state are configurable.

`useConfirmationDialog` offers a Promise-based helper for discard decisions. A page may also control `ConfirmationDialog` directly for asynchronous deletion and pass `loading` while the request runs.

## Feedback, buttons, and statuses

- `AdminFeedback` supports `info`, `success`, `error`, and `loading` tones with appropriate live-region roles.
- `AdminButton` supports `primary`, `secondary`, `destructive`, and `subtle` variants.
- `AdminStatusBadge` maps active/approved, inactive/pending, disabled/rejected, and unknown values to the established light-admin palette.

## Accessibility and manual checks

The existing Node test setup has no browser DOM renderer, so pure state transitions and submission locking are automated while focus and keyboard behavior require browser verification during integration:

1. Tab to a row and activate it with Enter and Space.
2. Verify opening a second row requests discard only when the first is dirty.
3. Cancel the dialog and confirm the draft and open row remain unchanged.
4. Confirm dialog focus enters on Cancel, Escape closes it, and focus returns to the trigger.
5. Confirm rapid Save clicks invoke the save callback once.
6. Interact with editor fields without collapsing the row.
7. Verify native refresh/tab-close warning appears only while dirty.
8. Verify reduced-motion mode removes accordion animation.
