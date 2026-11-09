# Approved redesign mapping

Visual authority: `C:/Users/info/Desktop/website/iLabRedesign/DESIGN.md` and its actual Shop templates. Production behavior authority: current Shop source and locked domain rules. Service source is a shared-pattern reference, not a component dependency or implementation destination.

**A** = direct template equivalent; reproduce its presentation with real data. **B** = production-only behavior; preserve and create a matching treatment. **C** = reference-only content/behavior; evaluate data and scope before adoption.

## Route and component matrix

Reference paths are relative to `iLabRedesign/`. Shop code paths are relative to this repository. All public routes in the table are mounted beneath `/shop`.

| Area | Class / approved reference | Production mapping | Migration requirement |
| --- | --- | --- | --- |
| Shop home | A, `src/pages/shop/index.html` | `app/(shop)/page.js`; `HomepageHero`, `HomepageDiscovery`, `HomepageFinder`, `Catalog` | Reproduce headline/finder/grid/section composition with runtime Brands/Models/Types. Apple grouping is presentation, not a new parent collection. |
| Brand directory | A, `src/pages/shop/iphone.html` | `app/(shop)/[brand]/page.js`, `BrandModelDirectory` | Generic data-backed Brand template; Series headings and active Models; preserve local directory search. No separate Series route. |
| Device/model listing | A, `src/pages/shop/iphone-14.html` | `app/(shop)/[brand]/[device]/page.js`, `DevicePageHero`, `DeviceProducts` | Match layout and filter/card treatment; preserve exact ancestry checks and inquiry/service links. Do not hardcode iPhone 14. |
| Product listing/cards | A within home and Model templates | `Catalog.js`, `ProductCard.js`, `DeviceProducts.js` | Real retail/wholesale/null/out-of-stock states, compatibility, quantity and inquiry actions; retain pagination and loading/error recovery. |
| Product detail | A, `src/pages/shop/product.html` | `app/(shop)/product/[slug]/page.js`, `ProductGallery`, `ProductPurchase`, `Breadcrumbs` | Match gallery/info/CTA hierarchy; keep canonical independent Product route and multi-Model compatibility links. |
| Category/product-type tiles | A presentation within home/listing | `HomepageFinder`, `HomepageDiscovery`, `type` query, `productTypeId` | Existing type filter, not a new `/category` route. No standalone approved category page found. |
| Series/category landing routes | No standalone A | Series are headings; Product Types are filters | B if approved later; do not fabricate a route family just to mirror static labels. |
| Cart | A, `src/partials/panels-shop.html` | `CartDrawer.js`, `CartContext.js` | Drawer template, not a standalone Cart page; preserve unavailable persisted lines, server prices, quantity bounds and validity. Presentation partly recovered. |
| Checkout | A, `src/pages/shop/checkout.html` | `app/(shop)/checkout/page.js`, `CheckoutClient`, `CheckoutAuthGate`, checkout action context | Preserve active-account gate, three fulfillment methods, two manual payments, real submit and confirmation. Fix SSR before styling. |
| Account | A, `src/pages/shop/account.html` | `app/(shop)/account/page.js`, `AccountProfileForm`, `AccountActions` | Preserve real profile/partner state and historical Orders/Invoice access; never copy mock authentication. |
| Header/navigation | A, `src/partials/header-shop.html` | `ShopHeader`, `SiteSwitcher`, `AuthControl` | Runtime Brand navigation, overflow/mobile menu, global Search, existing auth/Service locale bridge. Public header migration remains outstanding. |
| CTA Dock | A, `src/partials/dock-shop.html` | `ShopCtaDock.js/.module.css`, checkout action context | Recovered Pass 1B; 1024 breakpoint, desktop action pair/mobile bar. Checkout action submits existing form; do not replace with cart-only mock action. |
| Contact drawer | A, `src/partials/drawer-contact.html` and `panels-shop.html` | `ContactPanel`, drawer variant in `ShopFullscreenPanel` | Recovered dark square drawer/location tabs using live settings; 560 desktop/fullscreen below 1024. Keep real locations and links. |
| Search/inquiry panels | A shell where shared panels match; B content/workflow | `SearchPanel`, `SearchContext`, `PartInquiryCard`, `PartInquiryContext`, `ShopFullscreenPanel` | Preserve fullscreen semantics, in-memory dataset, Model suggestions, unpriced/availability logic and guest inquiry validation. Drawer mechanics must not replace content authority. |
| Footer | A, `src/partials/footer-shop.html` | No public Shop footer rendered in current `ShopShell.js` | Add shared public footer using truthful contacts/legal destinations and locale-aware Service links; validate destinations before copying. |
| Responsive states | A, `assets/css/shop.css`, `components.css`, `theme-light.css`, tokens | CSS Modules and `app/styles/tokens.css` | Translate reference tokens into existing system. Required widths 375/768/1024/1280/1600; actual mobile composition, focus and dock clearance. |
| Admin | B, no approved Admin replacement | `app/admin/*`, `app/admin/components/*` | Preserve useful editing UX; change only demonstrated functional/integrity defects. |

## Production-only states (B)

Keep complete support for: pending/disabled/approved accounts, real wholesale fallback and VAT display, null prices, unpriced visible Products, insufficient stock, unavailable persisted cart identities, auth repricing, guest checkout continuation, partial profile-save failure, price-change conflicts, idempotent retry, Order confirmation, immutable Invoice snapshots and PDF recovery, cancellation semantics, all configured fulfillment fees/locations, empty/error/loading catalog and search states, multi-Model compatibility, Service LV/RU destinations, generic part inquiries and Product availability inquiries.

Reference templates do not prove coverage for these states. Extend the approved visual grammar rather than deleting behavior to match the happy-path mock.

## Reference-only elements (C)

- Static names, prices, counts, stock, contact information and mock order/auth/localStorage scripts: replace with current providers/APIs, never copy as state owners.
- Ratings, reviews, quality/grade or specification badges, delivery guarantees, popular/related sections where the reference shows them: adopt only after verifying the actual field/editorial source and relevance. No invented commerce claims.
- Simulated checkout and any payment/fulfillment option outside `bank_transfer`, `cash_on_pickup`, `pickup`, `courier`, `omniva_parcel_machine`: no production authority.
- Motion implementation (reference JS/GSAP) is presentation. No new dependency is justified solely because the reference includes one; reproduce necessary behavior using current platform where practical and preserve reduced-motion/content fallback.

## Recovered Pass 1B and remaining integration

Current uncommitted files include the CTA Dock styles, Cart/Contact JS and CSS, generic fullscreen panel drawer variant and root font loading. Recovered regression test `tests/shop-cta-dock-redesign.test.mjs` exists. Comparison against preserved duplicate found twelve exact transferred files plus the expected appended migration-note difference. There is no evidence of lost valuable implementation or a consolidation blocker.

Pass 1B connects real Cart actions/resolution, settings-owned contact data, panel Escape/focus/scroll mechanics and checkout form submission. Keep it. The migration tracker calls Dock complete but also labels a larger panels phase “not started”; treat already recovered drawers separately from unfinished Header/Search/Inquiry/footer work. Populated/authenticated commerce still needs its own verification. A visual pass is not an order-flow certification.

## Visual evidence

Installed headless Chrome/CDP was used because CUA browser/native services were unavailable and Python/Playwright were unavailable. No browser dependency was installed. Reference pages were served by a read-only include resolver, not by changing/building the reference repository. Source-only comparisons are not claimed as rendered equivalence.

Representative paired home screenshots: [375 live](evidence/home-live-375.png) / [375 reference](evidence/home-reference-375.png), [1280 live](evidence/home-live-1280.png) / [1280 reference](evidence/home-reference-1280.png). The audit captured the required five widths. Current mobile Product cards are rounded/shadowed and single-column versus the reference's square hairline two-column grid; hero/type/finder composition also differs. Fixed Contact/Cart actions are already present. These are migration differences, not reasons to replace providers or data models.

Product images in an initial full-page capture may still be below-fold/unloaded; a placeholder alone is not proof of a broken asset. Authenticated checkout/account and privileged admin visuals cannot be certified without a suitable test identity. No screenshot is claimed as proof of completed redesign equivalence.

| Rendered family | Capture coverage | Principal visible finding |
| --- | --- | --- |
| Home | Live/reference at all five widths | Major hero/type/finder/grid differences; [1280 live](evidence/home-live-1280.png) / [reference](evidence/home-reference-1280.png). |
| iPhone Brand | Live/reference at all five widths | Rounded controls and Service card before directory versus reference hairline rows/facts and Service card after directory; live 48 Models versus static reference 40 must remain data-driven. [375 live](evidence/brand-live-375.png) / [reference](evidence/brand-reference-375.png). |
| iPhone 14 Model | Live/reference at all five widths | Single-column mobile cards versus reference two columns; different hero/filter/Service-card ordering. [375 live](evidence/model-live-375.png) / [reference](evidence/model-reference-375.png). |
| Product | Live/reference at all five widths | Different info hierarchy and missing footer. Live unpriced camera shows repeated unavailable messaging. Reference offers inquiry for no-price product, which conflicts with the locked priced-but-zero-stock inquiry rule; preserve rule and improve explanation. [375 live](evidence/product-live-375.png) / [reference](evidence/product-reference-375.png). |
| Guest Checkout | Live/reference at all five widths | Light centered login modal versus reference dark account drawer. This visual recovery coexists with direct HTTP500; it does not certify checkout health. [375 live](evidence/checkout-live-375.png) / [reference](evidence/checkout-reference-375.png). |
| Account guest boundary | Requested at all five widths | Live redirects to Shop; `account-live-*` are redirected Home screenshots. Reference signed-in mock is not comparable authenticated coverage. |
| Contact / empty Cart | Mobile 375 and desktop 1280 attempts | Dark drawer form substantially retained. Contact desktop measured 560px; mobile contact retry confirmed focus on Close Contacts. Some early clicks occurred before hydration and did not open the panel; use retry metrics, not a claimed failed interaction. [Contact desktop](evidence/drawer-contact-live-1280.png), [mobile](evidence/drawer-contact-live-375.png), [empty Cart mobile](evidence/drawer-cart-live-375.png). |
| Search / mobile navigation | Mobile and desktop where controls exist | Search focuses its input; mobile menu remains focused on its external trigger after activation. [Menu evidence](evidence/drawer-menu-live-375.png). |

`visual-metrics.json` records route, viewport, text and geometry at capture. General page capture waits were short and can precede streamed metadata; completed Product DOM is separately recorded in [product-rendered-metadata.json](evidence/product-rendered-metadata.json): title/description present, zero JSON-LD and no canonical. [Drawer metrics](evidence/drawer-metrics.json) and [Contact retry](evidence/drawer-retry-metrics.json) distinguish unsuccessful early clicks from opened dialogs.

All five required widths were **viewport emulations**, not physical-device/touch testing. Full-page images are capped at 16,000px, so tall Home screenshots are partial and do not establish bottom-page equivalence. Reference motion was disabled where supported; reference rendering/assets were served by a lightweight include resolver and are not a production build/performance baseline. The static mock cookie UI and claims/counts are not automatically production requirements. Most pages have not yet been migrated; do not grade their unfinished styling as a failure of the underlying architecture.

Additional guest Cart check used a real purchasable retail item: add, increment, decrement, reload persistence and removal passed with expected displayed totals. A nonexistent persisted identity with a forged price was normalized to ID/quantity and blocked Checkout; [cart-interactions.json](evidence/cart-interactions.json) and [missing-state screenshot](evidence/cart-missing.png) record the outcome. Only the read-only Cart resolve POST reached the server; order/auth/inquiry endpoints were blocked. Authenticated checkout submission/confirmation was not mocked successfully because the real server gate requires identity; do not claim that test as complete.
