# Architecture

## Application shape

iLab Shop is a Next.js App Router application deployed on Vercel and mounted at `/shop`.

Current stack:
```text
Next.js 16.3.5
React 19.2.8
Firebase client SDK 12.7.x
Firebase Admin SDK 13.6.x
```

The shop shares Firebase project `ilab-v2`.

Firebase responsibilities:
- Authentication — identity
- Firestore — catalog, users, orders
- Storage — product images
- Admin SDK — trusted server access

## High-level boundaries
```text
Browser
  +-- Public Shop UI
  |     ShopShell
  |       CartProvider
  |       SearchProvider
  |       Header / CTA dock
  |       Cart drawer
  |       Contact/Search panels
  |
  +-- Admin UI
  |     AdminShell
  |       Products / Catalog / Orders / Users
  |
  +-- Next.js route handlers on Vercel
          +-- auth/session verification
          +-- public-safe serialization
          +-- admin authorization/mutations
          +-- Firebase Admin SDK -> Firestore/Auth/Storage
```

Sensitive business decisions do not live solely in client components.

## Public route tree
```text
/
  Store home / general catalog

/[brand]
  Brand page

/[brand]/[device]
  Model/device page

/product/[slug]
  Canonical Product page

/account
  Authenticated account/profile/order history

/checkout
  Checkout
```

Because `basePath` is `/shop`, these are publicly mounted under `/shop/...`.

### Catalog hierarchy
Firestore:
```text
brand -> series -> model
```

Public:
```text
Home -> Brand -> Model/device -> canonical Product
```

Series are organizational headings on Brand pages and have no standalone route.

Brand pages keep catalog loading server-side through `getBrandCatalog()`, then pass the active ordered Series/Model hierarchy to a small client directory. Brand-local search filters that already-loaded hierarchy in memory and is separate from global Product Search.

Brand SEO fields (`metaTitle`, `metaDescription`, and their manual flags) live on the Brand's `shopDevices` document. The Admin Catalog validates and saves them with the Brand; public Brand metadata resolves through `getBrandCatalog()` and falls back to generated text for older documents without SEO values. Series and Models do not have SEO fields.

A Product route is independent of Device because one Product may support multiple Models.

The homepage visually groups the existing iPhone, iPad, MacBook, and Apple Watch Brand records as “Apple”; this is presentation only and does not add an Apple parent or route. Homepage Product Type tiles control the existing catalog through the `type` query parameter. They do not introduce Product Type routes or Firestore fields.

## Public Shop shell
`app/(shop)/layout.js` wraps public pages in `ShopShell`.

Current structure:
```text
CartProvider
  SearchProvider
    ShopShellFrame
      ShopHeader
      page content
      ShopCtaDock
      CartDrawer
      ContactPanel
      SearchPanel
```

`ShopShell` coordinates major overlays.

The public layout also supplies the active, canonically ordered Brand directory to `ShopHeader`. The Header renders the first five Brands directly, keeps any remainder in its client-side More menu, and shows the complete list in the existing mobile menu without additional catalog requests.

`ShopFullscreenPanel` is generic fullscreen infrastructure. Specialized content remains separate (`ContactPanel`, `SearchPanel`).

## Authentication
Firebase Authentication is the identity provider. Shared profile: `users/{firebaseAuthUid}`.

### Session cookie
`lib/auth/sessionAuth.js` verifies HTTP-only `ilab_shop_session`.

Used by session-aware server behavior such as Account/Admin access and permission-aware pricing.

### Bearer token
`lib/auth/serverAuth.js` verifies Firebase ID tokens from protected browser requests.

Never use request-body UID as proof of identity.

### Permissions
Centralized in `lib/auth/roles.mjs`. Do not duplicate role rules in page code.

## Public catalog data
Primary helpers:
```text
lib/shopCatalog.js
lib/shopProducts.js
```

They own active hierarchy/product reads, ancestry validation, public serialization, compatibility grouping and compact Search data.

Public serializers must never include `purchasePriceCents`.

Admin serializers remain separate.

## Search
Search uses no external service or Firestore search-index fields.

First Search open:
```text
SearchPanel
 -> SearchProvider.load()
 -> /shop/api/catalog/search-data
 -> compact active Products + Devices + Product Types
```

Dataset stays in React memory for the current `ShopShell` lifecycle.

Not stored in localStorage/sessionStorage/IndexedDB, a shared Vercel cache, or a Firestore index document.

`lib/searchCatalog.mjs` builds runtime normalized/indexed data and ranking.

Search context: SKU, Product name, Brand, Series, Model, Product Type.

Auth identity changes invalidate Search data.

## Cart
Owner: `app/components/shop/CartContext.js`.

localStorage stores only:
```text
productId
quantity
```

Key: `ilab_shop_cart_v1`.

Server resolution:
```text
CartContext
 -> POST /shop/api/cart/resolve
 -> session/profile
 -> current Firestore Products
 -> lib/commerce.mjs
 -> public-safe resolved lines
```

Auth changes re-resolve applicable price.

## Checkout/orders
Route: `/checkout`.
Order API: `POST /shop/api/orders`.
Server logic: `lib/shopOrders.js`.

Order creation:
```text
validate checkout
resolve current session/profile
Firestore transaction:
  read current Products
  validate active/stock/applicable price
  recalculate totals
  compare displayed expected total
  create Order
  decrement stock
```

Client totals are never authoritative.

The request UUID acts as the Firestore Order document ID/idempotency reference. Repeated valid submission by the same identity returns the existing Order.

## Admin
Routes:
```text
/admin
/admin/products
/admin/catalog
/admin/orders
/admin/users
```

`app/admin/layout.js` is the shared Admin route boundary.

Reusable Admin UI: `app/admin/components/`.

Server helpers include `lib/adminProducts.js`, `lib/adminDevices.js`, `lib/adminProductTypes.js`, `lib/adminUsers.js`, `lib/adminDashboard.js`, and `lib/shopOrders.js`.

The Admin Dashboard loads its operational snapshot server-side. `lib/adminDashboard.js` issues bounded calendar-window, filtered-attention, and limited-recent Firestore queries; `lib/adminDashboardMetrics.mjs` owns the pure Europe/Riga calendar aggregation and reporting rules.

Admin mutations must authorize server-side. `lib/auth/adminMutationAuth.js` provides the established mutation guard/same-origin pattern.

## Firestore
Core collections:
```text
users
shopProducts
shopDevices
shopProductTypes
shopOrders
shopSettings
```

### shopDevices
```text
id
name
slug
type: brand | series | model
parentId
order
status
```

### shopProducts
```text
id, sku, slug, name, description
productTypeId
purchasePriceCents, wholesalePriceCents, retailPriceCents
modelIds, seriesIds, brandIds
imagePaths, stockQty, status
metaTitle, metaDescription
metaTitleManual, metaDescriptionManual
createdAt, updatedAt
```

`modelIds` are authoritative; `seriesIds` and `brandIds` are derived.

### shopOrders
Orders preserve historical customer/Product/price snapshots. See `domain-rules.md`.

## Product images
Admin image paths are validated under `shop/products/...`.

`imagePaths[0]` is the primary image. Public Search/cards can use only the primary image; Product detail may use the full ordered gallery.

## Contact/pickup configuration
Single source: Firestore `shopSettings/general`, accessed server-side through `lib/shopSettings.js`. `lib/shopSettingsDefaults.mjs` supplies deployment-safe contact, pickup, currency, and VAT defaults without writing during reads. `lib/shopSettingsModel.mjs` owns pure normalization, validation, active-location filtering, and the explicit public-safe settings shape.

The public Shop layout reads runtime settings and passes only the public serializer through `ShopSettingsContext` to Contact, Search, Cart, and Checkout price presentation. Server pages and order creation use the same settings layer/model. Admin `/admin/settings` reads and writes through `/api/admin/settings`; browser code never accesses Firestore directly. Writes merge the UI-owned `currency`, `tax`, `contact`, and `pickupLocations` sections so unrelated future document fields survive.

Used by Contact UI and Checkout pickup validation. Do not duplicate addresses/phones/hours.

## Caching
Current architecture favors correctness over shared caching for permission-sensitive data. Sensitive/session-aware responses use private/no-store behavior.

Do not add a shared cache layer without a measured reason and explicit architecture decision.

## Server/client boundary
Client: browser Auth interaction, localStorage Cart identity, Search UI state, overlays, forms, DnD.

Server: Firestore, Firebase Admin, session/permission checks, private-field filtering, authoritative pricing, stock/order transactions, admin mutations.

Never import `server-only` modules into client components.
