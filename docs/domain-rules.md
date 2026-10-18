# Domain and business rules

These are locked product decisions unless a task explicitly changes them.

## Users
Profile: `users/{firebaseAuthUid}`

```text
uid, email, name, phone, billingAddress
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

All Product selling prices (`retailPriceCents` and `wholesalePriceCents`) are stored and charged VAT-inclusive. `tax.pricesIncludeVat` is currently a true system invariant, while the single VAT rate is editable in Shop Settings. Wholesale ex-VAT amounts are derived in integer cents from the real Wholesale price and the current VAT rate; they are never stored as Product fields and are never exposed when Wholesale itself is unauthorized. Retail fallback remains Retail and is not relabeled as Wholesale.

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

### Shop → Service interlinking
`shopDevices.serviceLink` is optional storage with a required logical destination for every Brand (use the Service homepage when no exact target is verified). The canonical shape stores one Service identity and both localized paths: `paths.lv` and `paths.ru`. Legacy `path` records are tolerated during migration. Paths follow the Service route helpers and translations; RU is not produced by prefixing an LV URL. A Model may store only an exact Service Device link; otherwise it inherits its Brand destination, ultimately falling back to the Service homepage. Series never stores a Service link. Products never store a Service link: derive destinations from their authoritative `modelIds`, resolve each Model then Brand fallback, and deduplicate by Service target identity.

Shop stays English-only and keeps its existing `/shop/...` URLs. A visitor's preferred Service language (`lv` or `ru`) is navigation context only, held in the first-party `ilab_service_locale` cookie (`Path=/`, `SameSite=Lax`, one-year lifetime), never in Firebase. Locale priority is valid incoming `serviceLocale` query parameter, existing cookie, same-origin non-Shop Service referrer, then LV. The client navigation bridge removes only `serviceLocale` from the visible URL after capture and preserves other query state. It does not read server cookies or make catalog pages dynamic. Public links are same-tab HTML anchors: render LV by default for crawlers/direct visitors and select the remembered locale after hydration. RU home is `/ru`; LV home is `/`.

When Service → Shop links are implemented separately, Service should append `?serviceLocale=lv` or `?serviceLocale=ru` only on the cross-app transition into Shop. No Service-side links are implemented here.

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

An active, priced Product with `stockQty === 0` remains visible and searchable but cannot be added to Cart or purchased. Its purchase CTA is replaced by `Request availability`, which submits through the existing `shopInquiries` flow with `source: "product"`. The server resolves the current Product and accepts the request only while the Product remains active, has an applicable price for that customer, and is unavailable because stock is zero. A Product that becomes available before submission is not added to Cart and does not create an Inquiry. Availability requests do not create preorders/backorders, reserve stock, collect payment, or create an Order or Invoice.

Inquiry `requestedPart` remains customer-entered for generic `model`, `brand`, and `search` sources. For `product` availability requests only, `requestedPart` is the canonical Product name from the server-resolved snapshot; the Product ID, name, SKU, slug, and compatible Model names are never trusted from browser-supplied display fields.

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

Public Search context: SKU, Product, Brand, Series, Model, Product Type. It is global and has no filter dropdowns. Matching active Models appear only as navigation suggestions in an autocomplete attached to the active Search input, not as a separate results section. Product results remain a global text match and are never silently scoped by selecting or suggesting a Model. An empty query does not list the catalog.

Admin Products Search uses the same hierarchy-backed Model matching, but selection applies visible Brand, Series, and Model filters instead of navigating. Model selection clears the Search query and resets pagination; later text searches remain global matches narrowed by those explicit filters.

Admin Product Search is also global, but explicit management filters remain available. Search matches are determined first; visibly active Brand, Series, Model, Product Type, and Status filters narrow those matches afterward. Clearing filters preserves Search, and clearing Search preserves filters. Filtering/ranking remains local.

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
Checkout requires an authenticated active account. Guest browsing and Cart use remain available, but unauthenticated Checkout opens the existing login/normal-customer registration experience before continuing. New Orders always store the authenticated UID; legacy guest Orders remain readable.

The current `users/{uid}` Profile provides reusable Checkout defaults: name, phone, optional company name/registration/VAT fields, and optional `billingAddress`. Older User documents without `billingAddress` remain valid and are read as an empty address. Pickup location is not a billing address.

Checkout initializes from the server-authoritative User Profile, then keeps an editable client draft for the current Order. The submitted customer/company/address values are validated and snapshotted into the Order; invoice buyer details and the PDF are derived from that Order snapshot, never from a live Profile read. Historical Orders, issued Invoice snapshots, and stored PDFs do not follow later Profile changes.

The customer may explicitly select “Save these details to my account for future orders” (checked by default). After the Order transaction succeeds, only name, phone, company name/registration/VAT, and billing address may be saved to `users/{uid}`. Profile updates are a separate post-Order operation; failure does not invalidate the Order or Invoice and must not trigger Order/Invoice recreation. Unchecking the control prevents the Profile update. Company may be cleared for ordinary customers; approved Partner company identity remains required by existing rules.

Checkout email is “Email for this order”: it is editable and stored only in that Order/Invoice snapshot. It is never written to `users/{uid}.email` and never changes Firebase Auth email. Account email is the sign-in identity and remains read-only in Profile; any future Auth email change belongs in a separate security flow.

## Fulfillment
Checkout supports exactly three methods: `pickup`, `courier`, and `omniva_parcel_machine`. Only the selected method's details are submitted and validated. Pickup locations use active, ordered entries from `shopSettings/general`; Checkout preselects the location when exactly one is available, and order creation revalidates and snapshots the configured location. Courier requires a delivery address; Omniva requires a city and parcel-machine/address description. Delivery details are immutable Order snapshots and are not saved to the customer Profile.

`shopSettings/general.delivery` owns VAT-inclusive integer-cent `courierPriceCents` and `omnivaParcelMachinePriceCents` values. Both default to zero and may be set to zero (free). Checkout may display these amounts, but the server recomputes the fee from current settings and compares the submitted expected grand total. Client fee values are never trusted. Orders snapshot `itemsSubtotalCents`, `deliveryFeeCents`, and `totalCents` (subtotal plus fee); delivery fees do not receive wholesale discounts. New Orders also snapshot VAT configuration; older Orders without `tax` remain valid and must not be reinterpreted using current VAT.

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

Bank-transfer details come from the immutable Invoice seller snapshot copied from `shopSettings/general.invoicing`.

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

## Admin dashboard reporting

Dashboard calendar periods and daily buckets use `Europe/Riga`. Current-month KPIs are compared with the previous complete calendar month. Sales, order count, average order value, the daily chart, and the Retail/Wholesale breakdown exclude cancelled Orders. Customer counts include newly created Customer and Partner accounts, including pending Wholesale applicants, but exclude Staff and Admin accounts.

Retail/Wholesale reporting uses each historical Order item's stored `priceSource`; it is not inferred from the buyer's current role. Delivery fees are reported separately. Any legacy Order value that cannot be attributed from stored line data remains visibly unclassified.

## Order creation
Browser submits checkout snapshot, one fulfillment method plus only its detail fields, payment method, Product IDs+quantities, expected displayed grand total for change detection, request UUID.

Server determines identity, pricing entitlement, current Products/stock/prices and authoritative totals.

Never trust client UID/role/Wholesale/unit price/line total/total/stock.

If current server total differs from the displayed expected total, do not silently place the Order; return conflict, re-resolve Cart, require review.

## Inventory
Successful Order creation decrements stock for both payment methods in the same Firestore transaction as Order creation.

Concurrent final-unit attempts: only one may succeed.

## Order snapshot
Conceptually:
```text
userId: uid
customer: { name, email, phone, company|null, billingAddress }
fulfillmentMethod: pickup | courier | omniva_parcel_machine
pickupLocation: { id, name, address } | null
delivery: { address } | { city, address } | null
paymentMethod
paymentStatus
orderStatus
items: [
  { productId, sku, slug, name, primaryImagePath,
    quantity, unitPriceCents, priceSource, lineTotalCents }
]
itemsSubtotalCents
deliveryFeeCents
totalCents (itemsSubtotalCents + deliveryFeeCents)
currency: EUR
tax: { pricesIncludeVat, vatRatePercent }
orderReference: "#YYYY-NNNNNN"
orderSequenceYear: YYYY
orderSequenceNumber: N
invoice: { id, number, sequenceYear, sequenceNumber }
stockRestoredAt
createdAt
updatedAt
```

Order history is historical snapshot data, not recomputed from today's Product records.

## Reference/idempotency
Current Order POST requires a UUID request ID; Firestore Order ID uses it. Repeated valid submission by the same identity can return the existing Order.

The Firestore Order ID remains the Checkout request UUID and idempotency key. The human-facing Order reference is `#YYYY-NNNNNN`; its `orderSequenceYear` and `orderSequenceNumber` are copied from the same yearly invoice sequence in the Order/Invoice creation transaction. For example, sequence `2026 / 15` produces Order `#2026-000015` and Invoice `SH - 2026 - 000015`. No separate Order counter exists. Repeated requests return the same Order reference and Invoice. Legacy Orders use structured canonical Invoice sequence metadata when available; otherwise the display falls back to `#` plus the first eight characters of the internal Order ID.

## Invoices
Every successful new Order atomically creates exactly one `shopInvoices/{orderId}` immutable accounting snapshot and an Order-level `{id, number}` reference. Numbers use `PREFIX - YYYY - NNNNNN`; `shopInvoiceSequences/{Europe-Riga-year}` is updated in the same transaction as the Order, Invoice, stock changes, and idempotency check. The Order stores its human display reference and sequence metadata from that same allocation. A retry of the same request returns the same Order reference and Invoice without consuming another number.

Seller/bank data is snapshotted from normalized `shopSettings/general.invoicing`; buyer, items, charged prices, and VAT come from the Order snapshot. Invoice line net/VAT cents derive from VAT-inclusive line gross values and always reconcile exactly to `order.totalCents`. Issued accounting content is immutable. Cancellation never deletes, renumbers, or rewrites an Invoice; credit/correction documents are out of scope. An authorized Shop Admin may explicitly and permanently delete an Order together with its canonical Invoice snapshot and stored PDF from the expanded Admin Order view. The deletion prompt requires a choice to restore or leave stock unchanged. Restoration is atomic with Order/Invoice deletion and is skipped when `stockRestoredAt` shows stock was already returned by cancellation. Deletion does not roll back invoice sequence numbers and must be clearly confirmed.

After commit, the Latvian A4 PDF is rendered from the Invoice snapshot only and stored privately in Firebase Storage. Operational `pdf` status/path/generated-time fields may change. Authorized download self-heals a missing/failed PDF without issuing another Invoice. Invoice emailing is not implemented.

## Cancellation
Cancelling restores stock server-side/atomically exactly once, protected by `stockRestoredAt`.

Cancelled is terminal in v1. Reopening would require explicit re-reservation logic.

## Account order history
Authenticated Account only reads Orders whose `userId` equals the current secure session UID. Guest history is not implemented.

## VAT/tax
Selling prices are VAT-inclusive. New Orders snapshot the configured VAT rate. Invoices use only that Order tax snapshot and split each authoritative gross line into integer-cent net and VAT values; historical invoices never use live VAT settings.

## Part inquiries
Part requests are a separate customer-support workflow stored only in `shopInquiries`, never in Orders. Guests and authenticated customers may submit. Generic Model/Brand/Search inquiries require the customer to manually enter the requested part, starting blank; Product Type filters, Search text, catalog context, and URLs never populate it. Model-page inquiries use the validated Shop Model and Brand snapshot; Brand-page inquiries use the validated Brand plus a manually entered Model that may not exist in the catalog; Search inquiries require a manually entered Model and retain Search text only as context. The Product-availability source is the only exception: its selected Product defines `requestedPart` from the server-authoritative Product name snapshot, and it records Product ID, name, SKU, stock state, and compatible Model names without trusting browser display fields. Contact name is required, and at least one of email or phone is required. Contact details and catalog names are immutable submission snapshots; inquiry submission does not update the User Profile. Statuses are exactly `new`, `contacted`, and `resolved`. Email notification is intentionally not implemented in v1.

## Future/not implemented
Do not implement without explicit requirements:
- card/online payment gateway
- courier/parcel delivery/shipping fees
- invoice email delivery
- credit/correction invoices
- promo/gift codes
- backorders
- reservation expiry timers
- ERP/accounting integration
- external Search service
