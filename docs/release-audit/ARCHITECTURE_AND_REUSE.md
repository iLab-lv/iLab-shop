# Architecture and component reuse audit

Audited 2026-11-09 (Europe/Riga). Shop: `C:/Users/info/Desktop/shop`, branch `home_design`, HEAD `6d6c371`, including the substantial existing tracked and untracked work. Service reference: `C:/Users/info/Desktop/website/iLab`, branch `feature/redesign-integration`, HEAD `84f4108`, including local files. This is an audit of working trees, not a releasable commit certification. No application fixes, commits, production writes or deployments were made.

## Assessment

Shop already has a sound feature-oriented foundation. Pricing and permissions are centralized, public and Admin serialization are separate, the public shell persists Cart/Search state, and most public page families compose shared feature components. The main maintainability problems are narrower: repeated overlay mechanics, repeated public data projections, duplicated money presentation, compressed multi-responsibility editors, and layers of CSS overrides. A repository merge, state-management migration, TypeScript conversion or universal page component is not justified.

The approved light storefront is retained. The comparison uses current Service code and its R8 audit/remediation documents as a reference, not as proof of Shop behavior. Service's current commit is newer than the base described in those historical reports. In particular, Service already has one layout-owned main and its current robots source already includes the Shop sitemap.

## Component and ownership map

```text
app/layout.js                         fonts, root metadata, HTML language
app/(shop)/layout.js                  server settings + Brand directory
  ShopShell                          persistent public composition
    ShopSettingsProvider / ServiceLocaleProvider
    CartProvider                     identity, resolution, account association
      lib/cartSync.mjs               I/O replay, no second provider
    SearchProvider                   lazy permission-sensitive in-memory dataset
    ShopHeader / ShopFooter / ShopCtaDock / ShopNavigationRulers
    main[data-shop-content]          route content
    CartDrawer
    ShopFullscreenPanel              Search / Contact / inquiry shells
      SearchPanel / ContactPanel / PartInquiryCard

Public route compositions
  /                                  HomepageHero / HomepageDiscovery / Catalog
    Catalog                          HomepageFinder / StorefrontCombobox / ProductCard
  /[brand]                           Breadcrumbs / BrandModelDirectory
  /[brand]/[device]                   Breadcrumbs / DevicePageHero / DeviceProducts
  /product/[slug]                    ProductGallery / ProductPurchase / compatibility
  shared merchandising               ServiceLinkCard / ShopTrustHighlights / PartInquiryCard
  /checkout                          server gate -> CheckoutClient
  /account                           server profile/history -> AccountProfileForm / InvoiceActions

app/admin/layout.js                  server authorization boundary
  AdminShell / AdminNav
  route managers                     Products / Devices / Types / Users / Orders / Inquiries / Settings
  app/admin/components               headers, forms, combobox, accordion, confirmation, feedback

lib/                                 server adapters + pure domain/presentation models
  shopCatalog / shopProducts          public reads and projections
  adminProducts / adminDevices / ...  validated privileged operations
  auth/roles + userModel              permission/profile invariants
  commerce / fulfillment             pricing, purchase state, Cart and delivery constants
  shopOrders / invoices              trusted transactions and immutable accounting snapshots
```

The provider nesting is verbose but ownership is understandable; introducing another global state system would make it worse. Server routes authorize close to the data. Page-specific compatibility markup and a compact Search result row legitimately differ from ProductCard and should remain distinct presentations.

## Reuse inventory

Paths below are repository-relative; Service paths are explicitly prefixed `Service:`.

| Component/pattern | Current implementations | Duplication or inconsistency | Proposed owner | Priority |
| --- | --- | --- | --- | --- |
| Modal lifecycle | `shop/ShopFullscreenPanel.js:8-44`, `shop/CartDrawer.js:12-17`, `components/AuthControl.js:33,169-211`, `shop/ShopHeader.js:41-62` under `app/components` | Four copies of fixed-body scroll locking; three FOCUSABLE selectors/traps; mobile navigation has no trap | Small public overlay lifecycle hook plus existing specialized shells; keep authentication and commerce content separate | P1 AR-01; consolidation P2 AR-04 |
| Main content landmark | `ShopShell.js:50`; every public route and CheckoutClient state | Layout and route both own `<main>` | ShopShell owns main; route bodies own div/article/section | P2 AR-02 |
| Public product projection | `lib/shopProducts.js:8-67`; `lib/shopCatalog.js:7-43,133-156` | Same identity/prices/stock projected three ways, differing integer/array guards and shapes | Public-only normalization/projection helper, specialized list/detail/search projections | P2 AR-05 |
| Product Types | `lib/shopProducts.js:69-76`; `lib/shopCatalog.js:107-110,155` | Same collection and active filtering; extra fields legitimately vary | Shared active Type reader, explicit compact projection | P2 AR-05 |
| Hierarchy reads | `lib/shopCatalog.js:45-89`; public layout and home | Full devices scan repeated by Brand directory and Finder, not request-deduplicated | Request-scoped shared active hierarchy reader | P2 AR-06 |
| Product cards | `components/ProductCard.js`, Catalog and DeviceProducts | Already shared; no competing model-page card | ProductCard | Retain |
| Search result | `shop/SearchPanel.js:20-77` | Separate dense row is appropriate; money/purchase labels repeat | Search retains Result; share narrow money/purchase presentation functions | P2 AR-07 |
| Prices | ProductCard `:11-12`, SearchPanel `:17-18`, Product route `:20-21`, CartDrawer `:10`, CheckoutClient `:12`, Account page `:40`, Admin Products/Orders/dashboard | 10 UI modules format money independently; unavailable labels and invalid-value guards differ | Pure money formatter; small feature-specific price blocks, existing WholesaleNetPrice retained | P2 AR-07 |
| Brand/Model selectors | StorefrontCombobox and AdminCombobox; Admin Products autocomplete; BrandModelDirectory local search | Combobox mechanics similar, but scope, clearing and business effects differ | Keep public/Admin shells separate; consider a narrow keyboard helper only after defects/tests show a need | No forced abstraction |
| Search suggestions | `SearchPanel.js:100,139-152`; Admin Products `:56-72` | Admin has attached keyboard autocomplete; public instead has separate Models section | Public Search owns navigation autocomplete using shared `searchCatalog.mjs` matching | P1 AR-03 |
| Breadcrumbs | `shop/Breadcrumbs.js`; Brand/Model/Product/Account routes | One renderer + shared JSON-LD helper already exist; Account manually includes Shop although component supplies it | Breadcrumbs owns Shop root; remove caller duplication in a later fix | P2, part of AR-02 |
| Repair-service CTA | `shop/ServiceLinkCard.js`, BrandModelDirectory `:42-44,114`, Model route `:29-36,43-46`, Home `:41` | Rendering shared; same fallback sentence/label construction repeated in three compositions | Narrow service-link presentation helper/local content constant | P2 AR-07 |
| Trust/benefits | `ShopTrustHighlights.js`, unused `ShopBenefits.js` | Active shared strip already supports page variants; obsolete strip has another delivery/pickup promise | Retain active strip; review unused strip before removal | P2 AR-08 |
| Page containers/headings | `BrandModelDirectory.module.css`, `CatalogPages.module.css`, `app/page.module.css`, Checkout/Account CSS | Repeated width/padding roles and later override blocks | Existing tokens + small public page-frame CSS convention | P2 DS-02 |
| Empty/error/loading | Catalog, DeviceProducts, SearchPanel, CartDrawer, CheckoutClient | Mostly feature-specific useful messages; no evidence a universal state component would improve them | Keep copy close to feature; share only repeated visual treatment | Retain |
| Admin editing | `app/admin/components/*`; route managers | Good shared dirty-state/confirmation/form foundation; route editor bodies are compressed orchestration + rendering | Feature-local extracted editor/presentation pieces | P2 AR-09 |
| FAQ | No public Shop FAQ page family found in route map | No duplicated Shop FAQ renderer demonstrated | Do not add an abstraction for an absent feature | None |
| Contact | ContactPanel and ShopFooter use settings; Service uses `settings/site` adapter | Correct separate repositories/settings contracts, not one shared database document | Shop settings adapter; coordinate business updates with Service | P2 AR-08 for one hardcoded identity |

## Meaningful hardcoding inventory

Counts denote inspected module consumers, not a claimed whole-database inventory.

| File/line | Value or pattern | Authoritative source / consumers | Risk and correction |
| --- | --- | --- | --- |
| `ShopFooter.js:20` | `SIA “iLab” · Reg. no. 40203288307` | Seller identity also exists in `shopSettings/general.invoicing`; one footer on every public route | AR-08: footer can diverge after settings change. Expose only public name/registration via existing public projection; do not expose bank fields. |
| `ShopTrustHighlights.js:21-22`; unused `ShopBenefits.js:11-12` | 3h Riga delivery / pickup today | Three active strip placements (Home hero, Brand, Product); one unused component | Static marketing promise is not backed by cutoff/coverage logic. Confirm approved promise and give it one local content owner; Firebase only if staff must edit frequently. Do not invent fulfillment rules. |
| ProductCard `:11-12`, Product route `:20-21`, SearchPanel `:17-18`, other money modules above | EUR/en-IE formatter and multiple unavailable fallbacks | `commerce.mjs` owns valid-price rules; 10 UI modules | AR-07: display drift, no duplicate authoritative pricing. Share formatting, not entitlements or page layout. Invoice's Latvian accounting formatter is intentionally separate. |
| BrandModelDirectory `:43-44,114`; Model route `:30-36,44`; Home `:41` | Repair-service fallback labels/sentence | Three public compositions | AR-07: future wording drifts. Small content/presentation function is sufficient. |
| `lib/shopCatalog.js:62-65`; `lib/homepagePresentation.mjs:3-4` | Seven exact display names determine Finder eligibility/order | One server Finder + discovery grouping consumers | AR-08: editorial curation is valid, but renaming/adding an active Brand silently excludes it from Finder. Use stable identity/slug mapping and an explicit fallback policy, without changing approved Apple grouping. |
| `lib/shopSeo.mjs:1-2`; `lib/shopSitemap.mjs:1` | `https://ilab.lv` and `/shop` | Metadata + sitemap owners | Intentional public-domain constants; modest duplication. Share a tiny public URL config when touching them; never derive canonical host from request Host. |
| `ShopFooter.js:45`; SiteSwitcher defaults | Service legal/home destinations | Footer/header/repair links | Stable URL config is acceptable. Legal link is not locale-aware; assess correct LV/RU destinations in SI-02. Do not construct RU paths by prefixing LV. |
| `ShopNavigationRulers.module.css:8-35`; `ShopHeader.module.css:1-85` | Repeated palette literals and fixed frame geometry | Global public shell | DS-02: stable geometry is legitimate, repeated palette decisions belong to tokens. Preserve contrast and 96px ruler geometry. |
| `lib/shopSettingsDefaults.mjs:1-10` | Contact, branches, hours, zero default delivery fee, seller fallback | Settings normalizer, public and server order readers | Intentional validated fallback configuration, not scattered page hardcoding. Service has separate `settings/site`; review consistency operationally. No automatic data consolidation. |
| `deviceFilterArtwork.js`; `homepagePresentation.mjs:6-...` | Illustration/image mappings | Finder + Brand visuals + Type tiles | Intentional local presentation assets. Keep out of product schema/compatibility logic. |
| English route/UI copy; LV/RU password recovery and ruler labels | Local English application copy plus Service-locale utilities | Public/Admin route families | Shop English-only is locked. No whole-store translation migration. DS-01 notes ruler accessibility labels incorrectly follow Service context. |

The runtime sample `back-camera-for-iphone-11` repeats its model in the description three times despite structured compatibility. This is a content-quality issue in an existing record, not a hardcoded component value. See DATA_AND_COMMERCE.md. Do not bulk rewrite older products to satisfy a new import template.

## Findings and targeted proposals

Every ID is counted once in RELEASE_READINESS.md. P2 recommendations are explicitly separated from observed functional defects.

**AR-01 — P1 confirmed: mobile modal navigation does not contain focus.** `ShopHeader.js:41-62,107-117` locks body scroll and declares `aria-modal`, but adds neither initial focus nor Tab containment/background inertness. At 390px, opening the menu and pressing Tab passed seven Brand links and Login, then focused “Browse parts →” behind the dialog. Scope: all public routes below 1024px. Impact: keyboard users operate obscured content. Approach: reuse/extract tested public overlay lifecycle with a deliberate header-close focus policy. Effort: S–M (0.5–1 day). Deployment blocker: **yes**, release accessibility gate. Do not replace the menu's approved appearance.

**AR-02 — P2 confirmed: duplicate main/root breadcrumb ownership.** `ShopShell.js:50` wraps route content in main; Home `:39`, Brand `:11`, Model `:40`, Product `:45`, CheckoutClient `:86-91`, CheckoutAuthGate `:4` and Account `:35` add mains. Browser checks measured two on all sampled public page families. Account additionally passes Shop to Breadcrumbs although it supplies the root. Scope: public layout/pages. Impact: confusing landmark navigation; redundant root in account breadcrumb. Approach: shell-only main and consistent breadcrumb input. Effort: S. Deployment blocker: no.

**AR-03 — P1 confirmed: public Search contradicts its locked contract.** `SearchPanel.js:100` asks for eight Model matches; `:139-152` renders a standalone Models section. `docs/domain-rules.md` requires at most five suggestions attached to the active input and no separate Model results section. Browser confirmed the Models heading. Product results remain global, so no hidden model filtering defect was found. Scope: public global Search; Admin's different selection effect is intentional. Approach: restore the documented attached, keyboard-operable navigation suggestions; preserve global products. Effort: M (0.5–1 day). Deployment blocker: no security blocker, but recommended before release as a locked-contract correction. Reconcile the rule explicitly if the approved Search design superseded it; do not silently decide during implementation.

**AR-04 — P2 recommendation: consolidate public overlay mechanics.** Four copies listed in inventory. Existing shared panel already handles Search/Contact/inquiry, so extract lifecycle behavior rather than a configurable mega-dialog. Admin native ConfirmationDialog can remain separate. Benefit: fixes such as AR-01, inertness and scroll restoration land once. Effort: M (1–2 days), regression risk to auth/cart focus and scroll. Deployment blocker: no; AR-01 may be fixed narrowly first.

**AR-05 — P2 recommendation: public projections have competing schema assumptions.** `shopProducts.js:45-67` and `shopCatalog.js:26-43,140-150` repeat price normalization/stock/ID logic; search validates arrays while list/detail mostly trust them; list/detail stock uses integer tests and search accepts finite fractions. No leaked cost or incorrect ordinary purchase was found; server resolver independently validates purchasability. Share public-safe normalization and Type reads, keep specialized payloads and Admin serializers separate. Effort: M; blocker: no.

**AR-06 — P2 confirmed implementation inefficiency: repeated hierarchy reads per request.** `activeDevices()` is uncached (`shopCatalog.js:45-47`). Home calls Brand directory and Finder (`app/(shop)/page.js:30`), while public layout also requests directory (`app/(shop)/layout.js:19`): three full hierarchy reads before route/metadata variations. Model/Product public and metadata loaders use different wholesale keys, so authorized sessions can repeat more work. Scope: page renders, not per-keystroke Search. Request-scoped React cache for permission-independent hierarchy/Types is sufficient; never introduce shared permission-sensitive price/Search caching. Effort: S–M; blocker: no. Read amplification is established from call graph; latency/cost savings are not quantified.

**AR-07 — P2 recommendation: narrow price/service presentation reuse.** Ten formatter owners and three service-fallback compositions listed above. Some values render `Unavailable`, others `Price unavailable`; ProductCard checks valid integers while Product/Search display helpers only special-case null. Extract pure formatter/labels, retain dense Search rows and product cards. Effort: S–M; blocker: no. This is presentation duplication, not a claim that client totals are authoritative.

**AR-08 — P2 recommendation: content/config ownership exceptions.** Footer seller identity, name-based Finder curation, repeated delivery copy and unused ShopBenefits are the meaningful exceptions. Scope: footer, home/Brand/Product content. Define public identity projection and local merchandising content; use stable Brand identities for curation. Review unused component before deleting it in a later authorized task. Effort: S–M; blocker: no. Three-hour promise accuracy needs business confirmation and is not asserted false.

**AR-09 — P2 recommendation: reduce editor/orchestrator review complexity.** `app/admin/products/ProductsManager.js:14-51` combines drafts, SKU reservation, uploads/progress, cleanup, filter URL state, dirty guards, API requests and rendering in long compressed lines. `DevicesSection.js`, SettingsManager and OrdersManager have similar dense feature orchestration. `PartInquiryCard.js:24-...` switches several prompt/inline/panel/product responsibilities. Existing pure helpers and Admin primitives should be extended, with feature-local ProductEditor/image-draft orchestration as separate responsibilities. Avoid a generic CRUD framework. Effort: M–L (2–4 focused days); risk: dirty drafts and image cleanup. Blocker: no. This is maintainability evidence, not a demonstrated security bug.

**AR-10 — P2 confirmed test-contract gap.** `tests/public-search.test.mjs:85-95` asserts the separate two-column Search layout, and `tests/shop-s3r-cards-and-rulers.test.mjs:72-100` asserts source strings/dimensions but not menu focus, overlay ruler blocking or utility-page behavior. All 297 tests pass while AR-01/03 and DS-01 remain. Pure commerce tests are useful and should be retained. After the contract decision, replace only obsolete layout expectations and add user-observable focus/suggestion/ruler cases. Effort: S–M; blocker: no. Do not delete broad business regression coverage or add tests that merely repeat new implementation strings.

## Refactoring dependencies

1. Confirm locked public Search contract and deployment/security gates before broad cleanup.
2. Fix mobile focus and landmark ownership independently; then consolidate overlay lifecycle with focused scroll/auth/cart regression checks.
3. Unify safe public normalization, then request-scope hierarchy/Type reads. Preserve public/Admin field boundaries throughout.
4. Share narrow money/content/config owners; only then split feature editors without changing their external APIs.
5. Normalize CSS tokens/override layers and ruler lifecycle (DESIGN_SYSTEM_CONSISTENCY.md).
6. Correct locale bridge and certify public deployed metadata/routing (SEO_AND_INTEGRATION.md).

Keep each as a small reviewable task. Full roadmap, validation evidence and deduplicated totals are in RELEASE_READINESS.md.
