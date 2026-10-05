# Domain and business rules

These are locked product decisions unless a task explicitly changes them.

## Users
Profile: `users/{firebaseAuthUid}`

```text
uid, email, name, phone
role: customer | partner | staff | admin
status: active | pending | disabled
partnerStatus: none | pending | approved | rejected
discountPercent
company: { name, registrationNumber, vatNumber }
createdAt, updatedAt
```

Constants/permissions: `lib/auth/roles.mjs`.
Validation/state transitions: `lib/auth/userModel.mjs`.

## Registration
Normal registration requires name, email, phone, password.

Normal result:
```text
role=customer
status=active
partnerStatus=none
discountPercent=0
```

Company is optional. Normal customer company registration/VAT can be optional.

## Wholesale
Wholesale application requires company name + registration number. VAT remains optional unless later decided.

Pending:
```text
role=customer
status=pending
partnerStatus=pending
discountPercent=0
```

Pending users cannot use an authenticated Shop session.

Approval:
```text
role=partner
status=active
partnerStatus=approved
```

Rejection:
```text
role=customer
status=active
partnerStatus=rejected
discountPercent=0
```

Company info is retained.

Admin can later enable wholesale for an eligible ordinary/rejected active Customer.

## Staff/Admin
Administrative roles are not partner combinations. Do not create `admin + approved partner` or `staff + approved partner`.

Staff/Admin already receive privileged price visibility.

Only active Admin may manage administrative role elevation/demotion. Preserve safeguards preventing invalid Staff/Admin management and loss of the last active Admin.

## Catalog
Hierarchy:
```text
Brand -> Series -> Model
```

`modelIds` are authoritative Product compatibility. `seriesIds` and `brandIds` are derived. Never infer compatibility from Product names.

Public routes:
```text
/
/[brand]
/[brand]/[device]
/product/[slug]
```

Series has no public page. Device route maps to a Model and must validate Model -> Series -> requested Brand ancestry.

Product canonical URL is independent of Device because one Product may support multiple Models.

## Products
Conceptual fields:
```text
id, sku, slug, name, description
productTypeId
purchasePriceCents, wholesalePriceCents, retailPriceCents
modelIds, seriesIds, brandIds
imagePaths, stockQty, status
metaTitle, metaDescription, metaTitleManual, metaDescriptionManual
createdAt, updatedAt
```

SKU is immutable after assignment. Slug is unique/canonical. Price values are integer cents or null. Null never means zero.

## Visibility/purchasability
Active Product may be public. Inactive Product is not public.

An active Product remains visible/searchable even if no applicable selling price exists.

Purchasable requires:
- active;
- applicable selling price;
- stockQty > 0.

Do not hide the unpriced catalog or create fake €0 prices.

## Pricing
Guest / active Customer:
- Retail visible.
- Retail is applicable price if present.
- Otherwise not purchasable.

Approved active Partner:
1. Wholesale if present.
2. Retail fallback if Wholesale missing.
3. Otherwise not purchasable.

Active Staff/Admin use the same applicable-price entitlement as approved Partners.

`purchasePriceCents` is Admin-only and must never be public.

Canonical helper: `lib/commerce.mjs -> applicableSellingPrice()`.

## Search
No external service, shared cache, search-index collection/document, `searchTokens`, `searchPrefixes`, or persisted generated search fields.

First Search open fetches a compact active dataset, kept in memory for the current `ShopShell` lifecycle. Reopening does not refetch. Hard refresh may. Auth changes invalidate permission-sensitive data.

Search context: SKU, Product, Brand, Series, Model, Product Type.
Filters: Brand -> Series -> Model; Product Type independent.
Filtering/ranking is local.

## Cart
Cart identity intentionally persists in localStorage under `ilab_shop_cart_v1`.

Persist only:
```text
productId
quantity
```

Persisted prices are never authoritative.

Server resolves Product existence/status/stock/current price/line total/Wholesale visibility. Login/logout can reprice the same cart.

Invalid persisted lines (deleted, inactive, missing price, out of stock, insufficient stock) must block Checkout until fixed; do not silently drop them.

## Checkout identity/profile semantics
Guest checkout is allowed.

Logged-in profile details are prefilled, but Checkout values are Order-specific snapshots.

Editing Checkout does **not** automatically update Firebase/Firestore user profile.

Name/phone: editable for this Order only.

Email: editable as this Order's contact email only. It must not change Firebase Auth email. Account email change belongs to a separate Account/security flow.

Company/invoice fields: editable for this Order only. They must not silently rewrite stored account/Partner company data.

Historical Order preserves exactly the submitted customer/company snapshot.

## Fulfillment
V1 is pickup only.

No courier, parcel locker, shipping fees, or delivery address yet.

Pickup locations use `app/components/shop/contactData.js`.

## Payment
Exactly:
```text
bank_transfer
cash_on_pickup
```

No card gateway/Stripe/PayPal/Apple Pay/Google Pay/online banking link.

Bank transfer starts:
```text
orderStatus=new
paymentStatus=pending
```

Do not invent IBAN/bank/SWIFT details. Until configured, confirmation can say payment details/invoice will be provided separately.

Cash on pickup starts:
```text
orderStatus=new
paymentStatus=unpaid
```

## Statuses
Order:
```text
new
processing
ready
completed
cancelled
```

Payment:
```text
pending
unpaid
paid
```

Keep these separate. Constants live in `lib/commerce.mjs`.

## Order creation
Browser submits checkout snapshot, pickup ID, payment method, Product IDs+quantities, expected displayed total for change detection, request UUID.

Server determines identity, pricing entitlement, current Products/stock/prices and authoritative totals.

Never trust client UID/role/Wholesale/unit price/line total/total/stock.

If current server total differs from the displayed expected total, do not silently place the Order; return conflict, re-resolve Cart, require review.

## Inventory
Successful Order creation decrements stock for both payment methods in the same Firestore transaction as Order creation.

Concurrent final-unit attempts: only one may succeed.

## Order snapshot
Conceptually:
```text
userId: uid | null
customer: { name, email, phone, company|null }
fulfillmentMethod: pickup
pickupLocation: { id, name, address }
paymentMethod
paymentStatus
orderStatus
items: [
  { productId, sku, slug, name, primaryImagePath,
    quantity, unitPriceCents, priceSource, lineTotalCents }
]
totalCents
currency: EUR
stockRestoredAt
createdAt
updatedAt
```

Order history is historical snapshot data, not recomputed from today's Product records.

## Reference/idempotency
Current Order POST requires a UUID request ID; Firestore Order ID uses it. Repeated valid submission by the same identity can return the existing Order.

This technical reference is not an invoice number. Do not invent accounting invoice numbering.

## Cancellation
Cancelling restores stock server-side/atomically exactly once, protected by `stockRestoredAt`.

Cancelled is terminal in v1. Reopening would require explicit re-reservation logic.

## Account order history
Authenticated Account only reads Orders whose `userId` equals the current secure session UID. Guest history is not implemented.

## VAT/tax
No VAT calculation/display rule is locked. Current selling prices are treated as final unit selling prices.

Do not add/subtract VAT or invent tax lines until specified.

## Future/not implemented
Do not implement without explicit requirements:
- card/online payment gateway
- courier/parcel delivery/shipping fees
- invoice numbering/PDF invoices
- VAT calculation/breakdown
- promo/gift codes
- backorders
- reservation expiry timers
- ERP/accounting integration
- automatic Checkout edits saving to Account
- external Search service
