# iLab Shop Admin — Pass 1 Audit and Implementation Plan

Date: 2026-09-22

Pass 1 is complete. This document records the read-only audit of the local iLab Shop working tree, the existing iLab service admin, and the legacy fixMobile shop admin. No application code, Firebase data, roles, dependencies, or schemas were changed during the audit.

## 1. Current iLab Shop admin and auth state

The local working tree contains newer authentication and authorization work than the original repository baseline and is therefore authoritative.

### Current architecture

- Next.js 16.3.5 with the App Router
- React 19.2.8
- Public mount point: `/shop`
- Internal admin route: `/admin`
- Public admin route: `/shop/admin`
- Firebase client Auth, Firestore, and Storage
- Firebase Admin Auth and Firestore
- Unified `users/{firebaseAuthUid}` profiles
- Centralized roles and permissions
- Verified Firebase bearer-token APIs
- HTTP-only Firebase session cookie
- Temporary homepage login/register UI
- Temporary protected admin placeholder

Relevant files:

```text
next.config.mjs
app/page.js
app/components/AuthControl.js
app/api/auth/session/route.js
app/api/users/me/route.js
app/admin/page.js
lib/auth/roles.mjs
lib/auth/serverAuth.js
lib/auth/sessionAuth.js
lib/auth/userProfiles.js
lib/firebaseClient.js
lib/firebaseAdmin.js
```

### Current authorization

Shop admin access uses:

```js
hasPermission(profile, PERMISSIONS.ACCESS_SHOP_ADMIN)
```

The helper requires an active profile. Current behavior is:

| Account | Shop admin access |
| --- | --- |
| Customer | Denied |
| Partner | Denied |
| Active staff | Allowed |
| Active admin | Allowed |
| Disabled staff/admin | Denied |
| Anonymous | Denied |

The `/shop/admin` page verifies the HTTP-only `ilab_shop_session` cookie with Firebase Admin before loading the profile. The homepage Admin button uses the same centralized permission helper.

### Current data model

Collections:

```text
shopDevices
shopProductTypes
shopProducts
users
```

`shopDevices` fields:

```text
id
name
slug
type
parentId
order
status
```

The device hierarchy is:

```text
brand
  series
    model
```

Products currently use `modelIds`, `seriesIds`, and `brandIds`. `modelIds` is authoritative; the other two arrays are derived. Pricing still uses the transitional `priceCents` field. The future three-price migration is outside the admin-shell scope.

The public product catalog currently uses cursor pagination with 48 products per request.

## 2. Existing iLab service admin findings

### Files inspected

```text
app/(admin)/admin/layout.jsx
app/(admin)/admin/AdminShell.jsx
app/(admin)/admin/AdminShell.module.scss
app/(admin)/admin/page.jsx
app/(admin)/admin/login/page.jsx
app/(admin)/admin/login/LoginForm.jsx
app/(admin)/admin/categories/**
app/(admin)/admin/devices/**
app/(admin)/admin/services/**
app/(admin)/admin/pricelist/**
app/(admin)/admin/reviews/**
app/(admin)/admin/faq/**
app/styles/_tokens.scss
app/api/admin/**
```

### Shell architecture

The service admin uses a server layout wrapping a client `AdminShell`:

- 240px persistent desktop sidebar
- Flexible right-hand main column
- Independently scrolling content area
- Sidebar footer pushed to the bottom
- 56px mobile topbar
- Off-canvas mobile sidebar
- Overlay below the sidebar
- Escape-key closing
- First-link focus when the sidebar opens
- Sidebar closes after navigation

### Visual behavior worth reproducing

- Dark background and layered dark surfaces
- Light primary text and muted secondary text
- Aqua accent color
- Subtle borders instead of heavy shadows
- 4/8/16/24/32px spacing rhythm
- 8–14px border radii
- Clear focus-visible states
- 1200px content maximum
- Bottom-aligned logout
- Consistent page title, toolbar, grouped panel, and field-grid patterns

Useful service token values:

```text
background: #000000
surface 1: #0a0a0a
surface 2: #141414
surface 3: #1f1f1f
border: #2a2a2a
primary text: #f5f5f5
secondary text: #b3b3b3
accent: #22d3ee
sidebar width: 240px
mobile header: 56px
content maximum: 1200px
mobile breakpoint: 768px
```

### Service behavior not to copy

- Its current guard checks only Firebase client authentication.
- It does not load `users/{uid}` or enforce active status and permissions.
- It uses raw anchor navigation rather than `next/link`.
- It has no current-route navigation styling.
- Its login page uses inline styles.
- The desktop sidebar can incorrectly receive `aria-hidden` while visible.
- Its routes, schemas, and API behaviors are service-specific.

The service repository is a visual reference only and must remain unchanged.

## 3. Legacy fixMobile findings

### Relevant reference files

```text
src/app/admin/ProductsManager.jsx
src/app/admin/components/ProductList.jsx
src/app/admin/components/ProductListItem.jsx
src/hooks/useFilteredProducts.js
src/app/admin/CategoriesManager.jsx
src/app/admin/ProductTypesManager.jsx
src/app/admin/components/ProductEditor.jsx
src/app/admin/modals/ProductFormModal.jsx
src/app/admin/layout.jsx
src/global/components/ui/Pagination.jsx
src/global/components/ui/ConfirmDialog.jsx
src/global/components/ui/InputPromptModal.jsx
src/global/components/ui/Modal.jsx
src/app/admin/styles/**
```

Repository: <https://github.com/askoldas/fixMobile>

### Useful product-management behavior

- Flat product list
- One expanded product row at a time
- Product Type, Brand, Series, and Model filters
- Brand changes reset Series and Model
- Series changes reset Model
- Filter changes reset pagination to page 1
- Compatibility filtering resolves through model IDs
- Add, edit, and delete workflows
- Confirmation before destructive actions
- Clear previous/next pagination state

### Useful device-management behavior

- Brand → Series → Model hierarchy
- Expand/collapse at every level
- Contextual add-child actions
- Reordering among siblings only
- Explicit drag handles
- Stable `order` updates

### Useful product-type behavior

- Compact sortable list
- Add, edit, and delete actions
- Confirmation before deletion

### Legacy architecture that must not be copied

- Redux store and slices
- Direct browser Firestore CRUD
- Legacy collection names
- Legacy `parent` field; the current shop uses `parentId`
- Legacy Firebase utility layer
- Loading the entire product catalog into the browser
- Client-only filtering and pagination for the full catalog
- Client-only AuthGuard
- Fixed inline admin layout styles
- Automatic reuse of `react-select`
- In-place object mutation during reordering
- One uncoordinated Firestore write for every reordered item
- Old price, image, storage, and product schemas
- Orders navigation

Future reorder mutations should be validated server-side and use a batch or transaction where appropriate.

## 4. Proposed shop-admin file structure

```text
app/
  admin/
    layout.js
    page.js
    admin.module.css

    products/
      page.js

    devices/
      page.js

    product-types/
      page.js

    users/
      page.js

    components/
      AdminShell.js
      AdminShell.module.css
      AdminNav.js
      AdminPageHeader.js
      AdminPlaceholder.js

lib/
  auth/
    roles.mjs
    serverAuth.js
    sessionAuth.js
    userProfiles.js
```

No route group is necessary at this stage. Keeping the complete section under `app/admin` makes the authorization boundary obvious.

`AdminShell` should live under `app/admin/components` because it is specific to this route tree rather than the storefront as a whole.

## 5. Authorization flow

`app/admin/layout.js` should be the shared page-tree guard:

1. Read the HTTP-only session cookie.
2. Verify it with Firebase Admin.
3. Load `users/{uid}`.
4. Call `hasPermission(profile, PERMISSIONS.ACCESS_SHOP_ADMIN)`.
5. Pass only a minimal `{ email, role }` DTO to the client shell.

Expected direct-navigation behavior:

| Identity | `/shop/admin` behavior |
| --- | --- |
| Anonymous | Redirect to `/shop/` |
| Customer | Render a simple access-denied state without the admin shell |
| Partner | Render a simple access-denied state without the admin shell |
| Active staff | Render the admin shell and page |
| Active admin | Render the admin shell and page |
| Disabled staff/admin | Render access denied |
| Missing/invalid profile | Redirect or deny without rendering admin content |

The layout guard protects page rendering. Future data-access functions, APIs, and mutations must also repeat authorization close to the data source. Hiding navigation or relying on a persistent layout is not sufficient security.

To avoid repeated profile reads, the server layout should load the profile once and pass the sanitized DTO to `AdminShell`. If later pages also require it server-side, the session/profile DAL can use request memoization.

## 6. Admin shell component plan

### `app/admin/layout.js`

Server Component responsibilities:

- Admin metadata and `robots: noindex`
- Session verification
- Centralized shop-admin permission check
- Anonymous and unauthorized behavior
- Passing `{ email, role }` to the shell
- Never passing UID, tokens, or the full user profile

### `AdminShell.js`

Client Component responsibilities:

- Mobile sidebar state
- Escape-key closing
- Overlay behavior
- Focus movement and restoration
- Closing navigation after mobile route selection
- Logout
- Rendering the sidebar, topbar, and content slot

It should not fetch the profile or make permission decisions.

### `AdminNav.js`

- Central navigation definition
- `next/link` navigation
- Active-route calculation
- `aria-current="page"`
- Mobile close callback

### `AdminPageHeader.js`

- Page title
- Optional description
- Future action slot

### `AdminPlaceholder.js`

- Consistent title and placeholder message
- Easy removal when each CRUD section is implemented

## 7. Navigation plan

```text
Dashboard      /admin
Products       /admin/products
Devices        /admin/devices
Product Types  /admin/product-types
Users          /admin/users
```

Logout remains at the bottom of the sidebar.

Use `next/link` with internal paths such as `/admin/products`. Next.js applies `basePath: "/shop"` automatically. Do not put `/shop` into `Link` destinations because it can produce double-prefixed routes.

Dashboard active matching should be exact. Section links should use prefix matching for future nested routes.

Do not include Orders or Settings.

## 8. Responsive plan

### Desktop

- Persistent 240px sidebar
- No overlay or hamburger
- Independently scrollable main content
- Logout at the bottom

### Tablet and mobile

- 56px sticky topbar
- Hamburger button
- Fixed slide-in sidebar
- Content scrim
- Sidebar above the scrim
- Close on link selection, overlay click, Escape, and logout
- Focus the first navigation item after opening
- Restore focus to the hamburger after closing
- Lock background scrolling while open
- Correct `aria-expanded`, `aria-controls`, and `aria-current`

The visible desktop navigation must never be marked `aria-hidden`.

## 9. CSS and visual reuse plan

The shop currently uses plain CSS Modules and has no Sass dependency. Pass 2 should not install Sass merely to copy the service admin.

Recreate the service visual system with admin-scoped CSS custom properties:

```text
--admin-bg
--admin-surface-1
--admin-surface-2
--admin-border
--admin-text
--admin-text-muted
--admin-accent
--admin-sidebar-width
--admin-mobile-header-height
--admin-content-max
```

Reproduce the layout, spacing, color hierarchy, focus states, and responsiveness—not the service repository's SCSS implementation. Do not globally redesign the temporary catalog homepage.

## 10. Placeholder page plan

Dashboard remains minimal:

```text
Shop Admin
Logged in as: <email>
Role: <role>
```

No analytics or collection counts are needed in Pass 2.

Placeholder pages:

```text
Products
Product management will be implemented next.

Devices
Device hierarchy management will be implemented later.

Product Types
Product type management will be implemented later.

Users
User management will be implemented later.
```

## 11. Risks and conflicts

### Base path

- Use `/admin/...` with `Link` and Next router navigation.
- Use `/` when redirecting to the application root.
- Do not use `/shop/admin/...` inside Next navigation components.
- Raw browser API requests still need to account for `/shop/api/...` unless a shared helper is introduced.

### Server/client boundaries

- Session verification and permission checks stay on the server.
- Mobile interactions and logout stay in the client shell.
- Do not import `server-only` helpers into the client shell.
- Pass only email and role into client code.

### Persistent layouts

Next layouts can persist during client navigation. Future protected data reads and every privileged mutation must enforce authorization independently.

### Logout synchronization

Logout must clear both Firebase client Auth and the HTTP-only server cookie, then navigate to `/` and refresh router state.

### Existing temporary auth UI

The homepage `AuthControl` should remain during Pass 2. Its Admin link already targets `/admin` correctly. Do not duplicate the authentication modal inside the admin section.

### CSS isolation

Admin styling must remain scoped so the catalog homepage is unaffected.

### Dependencies

Pass 2 requires no new dependency. Drag-and-drop dependencies should be considered only when Devices or Product Types CRUD begins.

### Existing staged changes

The current authorization and temporary authentication files are staged local work. Pass 2 must build on them without resetting or reconstructing them.

## 12. Exact Pass 2 implementation scope

### Create

```text
app/admin/layout.js
app/admin/components/AdminShell.js
app/admin/components/AdminShell.module.css
app/admin/components/AdminNav.js
app/admin/components/AdminPageHeader.js
app/admin/components/AdminPlaceholder.js
app/admin/products/page.js
app/admin/devices/page.js
app/admin/product-types/page.js
app/admin/users/page.js
```

### Modify

```text
app/admin/page.js
app/admin/admin.module.css
lib/auth/sessionAuth.js
```

Expected changes:

- Replace the standalone admin placeholder with shell-compatible dashboard content.
- Move shared admin-page authorization into `app/admin/layout.js`.
- Add a narrowly named shop-admin session guard or memoized session accessor.
- Reuse or repurpose the existing admin CSS for dashboard content.

### Leave untouched

```text
app/page.js
app/page.module.css
app/components/AuthControl.js
app/components/AuthControl.module.css
app/components/Catalog.js
app/components/ProductImage.js
app/api/products/route.js
app/api/users/me/route.js
app/api/auth/session/route.js
app/api/admin/users/[uid]/route.js
app/api/partner-applications/route.js
lib/auth/roles.mjs
lib/auth/serverAuth.js
lib/auth/userModel.mjs
lib/auth/userProfiles.js
lib/firebaseClient.js
lib/firebaseAdmin.js
lib/shopProducts.js
migrations/**
public/**
scripts/bootstrap-admin.mjs
```

No Firebase, Firestore, Storage, pricing, catalog schema, role, user, or security-rule changes belong in Pass 2.

## 13. Decisions before implementation

No blocking product decision remains.

Recommended Pass 2 behavior:

- Anonymous users redirect to `/shop/`.
- Authenticated unauthorized users receive an access-denied state without admin navigation.
- Active staff and admins receive the responsive admin shell.
- Dashboard shows email and role only.
- Products, Devices, Product Types, and Users begin as placeholders.

Implementation must not begin until Pass 2 is explicitly approved.
