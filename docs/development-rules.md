# Development and component rules

## Reuse-first
Before creating code: search, inspect nearest implementation, reuse/extend when responsibility matches, create new only when responsibility is distinct.

## Component composition
Prefer generic infrastructure + focused feature content.

Existing example:
```text
ShopFullscreenPanel
  -> ContactPanel
  -> SearchPanel
```

Do not create a type-switched fullscreen mega-component.

## Public components to check first
Under `app/components/` and `app/components/shop/`:
```text
AuthControl
Catalog
ProductCard
ProductImage
AddToCartButton
Breadcrumbs
CartContext
CartDrawer
ContactPanel
DeviceProducts
ProductPurchase
SearchContext
SearchPanel
ShopCtaDock
ShopFullscreenPanel
ShopHeader
SiteSwitcher
ShopShell
```

Avoid page-local copies of behavior already owned here.

## ShopShell
`ShopShell` owns the public persistent provider/overlay frame. Inspect it before adding a global overlay/control. Avoid multiple scroll-lock/focus systems fighting each other.

## Single sources
- locations/contact/tax → `shopSettings/general` through `lib/shopSettings.js` (defaults in `lib/shopSettingsDefaults.mjs`)
- pricing/cart constants → `lib/commerce.mjs`
- permissions → `lib/auth/roles.mjs`
- profile transitions → `lib/auth/userModel.mjs`
- order server rules → `lib/shopOrders.js`
- tokens → `app/styles/tokens.css`

## Server/client boundaries
Server: Firestore/Admin SDK, session/permission, public field filtering, authoritative prices/stock/orders/admin mutations.

Client: Firebase client Auth interaction, localStorage Cart identity, Search UI state, overlays, forms, DnD.

Do not import `server-only` into clients.

## Public serialization
Whitelist fields. Do not return full Firestore docs. Never expose purchase price. Wholesale is omitted server-side for unauthorized users.

## Base path
`basePath="/shop"`.

Next navigation uses `/account`, `/checkout`, `/admin/...`, etc. Do not prepend `/shop`.

Raw browser fetches currently target mounted `/shop/api/...` paths; follow existing conventions.

## Styling
Use CSS Modules + `app/styles/tokens.css`. No separate Admin blue, no arbitrary generic blue, no Sass just for consistency.

## Admin editing foundation
Before creating admin primitives inspect `app/admin/components/`.

Reusable pieces:
```text
AdminAccordionRow
AdminButton
AdminCombobox
AdminEditorActions
AdminFeedback
AdminForm
AdminLogin
AdminPageHeader
AdminStatusBadge
ConfirmationDialog
useAdminEditorAccordion
useConfirmationDialog
```

### Accordion/editor behavior
- controlled expanded state;
- stable ARIA relationships;
- keyboard-operable summary;
- interactive descendants do not accidentally toggle;
- editor form interaction does not collapse row.

`useAdminEditorAccordion` owns one section's open/dirty state. Device-tree expansion remains separate.

Dirty state:
- switching/closing asks before discarding;
- cancel keeps draft/open editor;
- failed save keeps draft/errors/open state;
- successful save marks saved;
- refresh/tab-close warning only while dirty.

### Actions/forms
Use `AdminEditorActions` for Save/Cancel/Delete/extra actions. Keep destructive actions near their domain and confirm them.

Use Admin form primitives when they fit:
- stable IDs;
- labels;
- `aria-describedby`;
- `aria-invalid`;
- controlled values.

Use shared Confirmation/Feedback/Button/Status components rather than page-local variants.

## Admin roles
Administrative access and Wholesale state are separate concepts. UI must not present Customer/Partner/Staff/Admin as one unrestricted interchangeable role selector. Preserve server validation.

## Catalog editing
Hierarchy: Brand -> Series -> Model.

Reorder only valid siblings, use explicit drag handles and stable `order`, use existing `@dnd-kit` where appropriate, and persist through validated server batch/transaction patterns.

Do not mutate arrays/objects in place or write directly from browser to Firestore.

## Legacy architecture not to copy
Do not revive historical fixMobile patterns:
- Redux store/slices
- direct browser Firestore CRUD
- old collections/schema/`parent`
- old Firebase utility layer
- client-only authorization
- automatic `react-select`
- inline fixed admin layout styles
- in-place reorder mutation
- one-write-per-item reorder persistence
- old price/image schemas

## Search
Do not add per-keystroke server requests, localStorage Search cache, external service, or Firestore search fields/index docs.

## Cart
Use existing `CartContext`; no second cart provider. Persist only Product ID+quantity for basket identity. `cartSync.mjs` coordinates guest association/account mirrors and retryable UUID operations; `shopAccountCart.js` alone writes session-owned `shopCarts`. Respect the documented MAX merge policy and separate guest/account keys. Client prices are display state, never authority. Auth changes re-resolve; stale responses must not certify another identity or basket. Order completion refreshes the transactionally reduced account basket, rather than clearing another device's additions.

## Checkout
Prefill the editable Checkout draft from the server-authoritative `users/{uid}` Profile. The Order and Invoice use the submitted snapshot, never live Profile data. An explicit, checked-by-default save-to-Profile choice may update only name, phone, company name/registration/VAT, and billing address after Order success; failures remain non-fatal to the Order. Checkout email is Order-only and never updates Firebase Auth/account email.

## Errors/loading
No `alert()` for application flows. Use inline feedback/live regions. Do not leak raw Firebase errors. Guard duplicate submits and preserve drafts/cart on failure.

## Accessibility
Check keyboard, focus-visible, labels, semantics, no nested interactive controls, Escape/focus restore for overlays, ARIA state, live regions and reduced motion.

## Responsive
Check desktop/tablet/mobile. Preserve fixed header/bottom dock clearance, Admin mobile sidebar, fullscreen panels and no horizontal overflow.

## Dependencies
Before adding a package, verify existing dependencies/platform/browser APIs cannot solve it. Do not add external services without explicit approval.

## Tests
Current commands:
```bash
npm test
npm run lint
npm run build
```

Current test suites cover authorization, commerce, Search, admin catalog/tree/products/types/users/editing.

Follow the risk-based validation policy in `../AGENTS.md`: focused checks for small changes, focused tests and relevant lint for medium tasks, broader tests/lint/build at major feature completion, and comprehensive regression/browser checks for release preparation. Run `npm test` when shared business logic changes. Do not repeat full suites/builds for minor edits without new risk or failures. Preserve necessary authentication, payment, order, inventory and private-data security validation.

Add focused pure-logic tests when shared rules change. Do not add a heavy browser test stack casually for one interaction. Use representative pages/viewports during implementation; comprehensive visual review belongs at milestones. Five-width coverage is reserved for final or high-risk validation.

## Documentation
When implementation changes a documented contract, update the relevant docs in the same task. Keep docs concise enough that future agents read them.
