# iLab Shop S0 audit

Audit dates: 2026-11-02–03 (Europe/Riga). Scope: current authoritative working tree, audit and planning only. No application implementation, database mutation, staging, commit, branch change or deployment is authorized by this report.

Read [ISSUES.md](ISSUES.md) for priorities, [REDESIGN_MAPPING.md](REDESIGN_MAPPING.md) for template coverage, and [ROADMAP.md](ROADMAP.md) for implementation gates.

## Assessment

**Continue the existing application. A rewrite is not justified.** This is a substantial working commerce foundation with unfinished catalog readiness, a reproducible checkout entry defect, incomplete technical SEO, and a partially integrated public redesign. Preserve server authority, the catalog hierarchy, providers, admin editors and order/invoice logic. A polished template is not evidence of a working purchase lifecycle.

The leading release gates are:

1. Fix direct guest Checkout SSR: HTTP 500, `document is not defined` (`AuthControl.js:54,315`).
2. Approve a sellable launch catalog and verify real inventory. Most currently public products have no retail price; this is allowed by the business rules but does not make a ready-to-sell shop.
3. Verify deployed Firestore/Storage rules and authenticated commerce against isolated test data. Source and pure tests cannot prove deployed access controls or transaction behavior.
4. Complete canonical/indexation/schema foundations and connect the Shop sitemap to the root site's discovery mechanism.
5. Integrate approved templates around the existing behavior, retaining recovered Pass 1B.

Also resolve dependency advisory exposure before release: `npm audit --omit=dev --json` reports 16 affected production-package entries (1 critical, 7 high, 8 moderate). These are package classifications, not sixteen demonstrated exploits. See S0-25 and the [registry result](evidence/dependencies.json).

## Repository and preservation

| Item | Observed state |
| --- | --- |
| Authoritative checkout | `C:/Users/info/Desktop/shop` |
| Origin | `https://github.com/iLab-lv/iLab-shop.git` (fetch and push) |
| Branch / HEAD | `home_design` / `6d6c37171f2328833f9bbb2772387955ddb92119` |
| Initial state | 13 modified tracked files; untracked migration/recovery docs, exports, export script and dock test; index empty |
| Redesign reference | `C:/Users/info/Desktop/website/iLabRedesign`, read only |
| Service source | `C:/Users/info/Desktop/website/iLab`, read only |
| Recovery | No evidence of unfinished source consolidation. Twelve of thirteen transferred files match the preserved duplicate byte for byte; migration tracker differs by the documented appended recovery note. See [recovery record](../REPOSITORY_RECOVERY.md). |

The recovery history is supported by the current files and read-only comparison, not independently re-performed archival restoration. No remote fetch was used to infer branch currency. Existing migration status/branch labels are historical; the current checkout above is authoritative. This audit's only intentional file outputs are under `docs/shop-s0/`. Normal checks regenerate ignored `.next` output.

## Actual architecture

Next.js **16.3.5**, React **19.2.8**, App Router, CSS Modules, centralized `app/styles/tokens.css`; Firebase Auth, Firestore, Firebase Storage and Admin SDK; Vercel deployment with `basePath: '/shop'`. Dependencies include DnD Kit and React PDF. No Redux or external search platform is needed for the present scope.

Public paths below are mounted under `/shop`; Next navigation uses the unprefixed internal paths.

```text
Shop /                  -> Brand /[brand] -> Model /[brand]/[device]
    -> canonical Product /product/[slug] (shared by all compatible Models)
    -> Cart drawer -> authenticated /checkout -> confirmation -> /account
Admin /admin            -> products, catalog, orders, inquiries, users, settings
```

`app/(shop)/layout.js` loads public settings and Brands, then `ShopShell` owns settings/locale/cart/search providers and overlay coordination. Search loads its compact active dataset once per shell lifetime; identity changes invalidate it. Cart persists only Product ID and quantity and resolves prices/stock through `/shop/api/cart/resolve`. Route handlers and `lib/` own data/security; Firebase browser SDK provides identity and image URL lookup. No parallel cart/search/session state system is warranted.

`lib/auth/roles.mjs` centralizes active-account permissions and wholesale entitlement. Session cookies are HTTP-only, SameSite=Lax, scoped to `/shop`, production Secure, verified with revocation checks. Bearer-token requests verify Firebase identity. Admin pages and mutations authorize server-side; mutation guards check origin. Customer profile writes whitelist editable defaults and do not grant roles from browser claims. Public catalog field projections exclude purchase prices; wholesale fields are entitlement-sensitive. An anonymous public catalog read found neither purchase nor wholesale fields.

`lib/shopOrders.js` recalculates prices/stock and totals, checks expected displayed total, uses request UUID idempotency, creates Order and Invoice snapshots, allocates the Riga-year sequence, and decrements inventory inside one Firestore transaction. PDFs are generated after commit, stored privately and can be regenerated from the immutable snapshot. Cancellation restores stock once; cancelled is terminal. This architecture is appropriate. Small source-level reliability concerns and missing integration tests are listed separately from proven failures.

Genuine debt: repeated hierarchy reads without request-level reuse, client-resolved product images, some dense server modules, limited long-term order listing, incomplete error/loading boundaries and no repository-owned deployment rules/index definition. Simplify measured hot paths; do not add caching to permission-sensitive data without a design decision.

## Catalog and administration

| Evidence scope | Result |
| --- | --- |
| Export `2026-10-30T19-47-43-063Z` | 605 active Products; 181 Devices (7 Brands, 34 Series, 140 Models); 8 Product Types |
| Export selling-price completeness | 602 missing retail; 601 missing wholesale; 601 missing both |
| Export integrity | No duplicate Product slugs, invalid Model references or derived ancestry mismatches; all 605 SKUs integers; one missing image; one zero-stock Product |
| iPhone compatibility in export | 473 Products linked to iPhone, with 510 Model references; compatibility derives from `modelIds` |
| Current read-only anonymous catalog API | 787 Products, 181 Devices, 8 Types; 784 missing retail prices; 183 zero stock; 9 missing primary images; no private pricing fields |

The export is **not current production truth**: live counts differ materially. Its wholesale completeness cannot be extrapolated to today's private prices. The public API is a current read of the configured Firebase-backed local application, not a stock audit or proof that every deployment has identical environment/data. See [summary](evidence/public-catalog-summary.json). Do not interpret positive stock as physical inventory confirmation: migration reports explicitly questioned legacy quantity values.

Read-only pagination also returned all 787 active Products across 18 requests, with valid unique slugs. Three Brands (Huawei, Samsung, Xiaomi), two Series and three Models have no current Product compatibility links. All 787 returned descriptions are nonempty and at least 80 characters, but 235 contain tested generic marketing phrases; length alone is not useful product detail. No structured specification field is returned. These are merchandising/content observations, not instructions to remove valid hierarchy or generate long SEO copy.

The schema is sufficient for existing navigation, filtering and concise Product pages: immutable SKU, unique slug, type, cents/null selling prices, stock, ordered image paths, description, SEO fields and compatibility. `modelIds` is authoritative; Brand/Series arrays derive from ancestry. There is no general technical-specification/quality-grade/variant schema to populate reference-only claims automatically. Keep descriptions concise; present compatibility from the existing relationships rather than duplicating lists in copy.

Admin already supports product creation/editing, category/type and Brand/Series/Model selection, compatibility, three price fields, stock, ordered images, status, deletion, SEO overrides, dirty editor state and confirmation dialogs. SKU allocation/slug checks are transactional; catalog deletion/deactivation guards protect references. Orders, inquiries, users, partner approvals and runtime settings also exist. Preserve this UX. Authenticated admin mutation behavior was inspected in source, not exercised against live data. Image decode validation and cleanup race handling deserve scoped hardening, not an admin redesign.

## Purchasing workflow status

“Verified” below names its verification scope. Unit/source-contract tests are not end-to-end transaction verification.

| Feature | Classification | Evidence / limit |
| --- | --- | --- |
| Product purchasability, price fallback, invalid cart reasons | Implemented and verified (pure tests) | `commerce.mjs`, `commerce.test.mjs`; anonymous catalog output checked |
| Add/remove/quantity/cart persistence and resolution | Implemented and verified (guest browser sample) | Actual retail item add/increment/decrement/reload/remove and missing identity block passed; identity changes/request races still need isolated tests |
| Out-of-stock availability requests | Implemented but unverified end to end | Server resolves Product and compatible Models; inquiry is separate from Orders, no reservation |
| Guest Checkout entry | Partially implemented / defective | Gate exists but fresh direct HTTP request returns 500 |
| Authenticated checkout/customer defaults | Implemented but unverified end to end | Active account required; editable Order snapshot; optional profile save after success; Order email never changes Auth email |
| Fulfillment | Implemented and verified (validation/fee unit scope) | Pickup, courier, Omniva; configured fees and location snapshots; no carrier integration claimed |
| Payment | Implemented manual methods | Bank transfer and cash on pickup; gateway intentionally deferred, not a missing approved feature |
| Order creation/pricing/stock/idempotency | Implemented but unverified against isolated Firestore | Source transaction review plus pure tests; no real Order submitted |
| Confirmation and failure recovery | Implemented but unverified end to end | In-place confirmation, invoice actions, draft/cart retained on failure; same mounted request UUID reused on retry |
| Invoice snapshot, numbering, PDF/download | Implemented but unverified end to end | Accounting arithmetic tests and source contracts; no live invoice downloaded because missing PDF can trigger writes |
| Order history/admin statuses/cancellation | Implemented but unverified end to end | Owner UID filtering, separate payment status, terminal cancellation and stock-restoration guard |
| Notifications | Missing / intentionally deferred for invoice/inquiry email | No email provider or customer/admin order notification path found; operational ownership needs review |
| Card gateway, reservation expiry, credit notes, ERP | Intentionally deferred | Locked domain scope; do not add silently |

## Technical SEO and cross-app ownership

Implemented: server-rendered names/headings/product links; Product/Brand metadata with stored overrides and fallbacks; generated Model title/description; semantic breadcrumb navigation; active hierarchy-aware Shop sitemap, hourly revalidation and safe URL/timestamp filtering. Local sitemap returned HTTP 200 with **934 URLs**; it is already implemented, not work to recreate.

Sitemap reconciliation: 786 Product URLs, 7 Brands, 140 Models and home. One current active Product URL was absent while sitemap returned cache HIT; its 164-character slug exceeds the sitemap helper's 160-character limit even though it matches the allowed characters. This is a current validation mismatch, not proof of ISR lag. Align permitted slug length across public/admin/sitemap paths and preserve or redirect the long URL deliberately; do not silently drop the Product. See [reconciliation evidence](evidence/catalog-reconciliation.json).

Missing in inspected source: absolute canonical tags, `metadataBase`, social Open Graph metadata, Product/Offer/BreadcrumbList/Organization JSON-LD, explicit Account/Checkout noindex. Admin already has noindex/nofollow. Product images resolve through browser Firebase calls, so initial HTML does not expose their final images. Rendered schema checks are recorded with the browser evidence; do not infer dynamic-schema absence solely from converted web text.

The Service `next.config.mjs:525-534` proxies `/shop` and `/shop/:path*` to `i-lab-shop.vercel.app`. Root robots belongs to Service. Local Service robots advertises only `https://ilab.lv/sitemap.xml`; Service sitemap source contains no Shop coverage. A public network read confirms root robots advertises only that sitemap, while `/shop/sitemap.xml` itself returns 200. This contradicts `docs/architecture.md`'s claim that robots advertises both. Root robots must advertise the independent Shop sitemap, or the root sitemap index must discover it, as a separately reviewed Service change. Do not replace the proxy.

The Vercel host returns 200 for `/shop` with no canonical or X-Robots-Tag in the sampled response: duplicate-host exposure is real, actual duplicate indexing is unverified. Prefer public `https://ilab.lv/shop/...` canonical ownership; test any host redirect against proxy fetches and assets before changing infrastructure. Local `/shop/iphone/` redirects 308 to `/shop/iphone`; deployed www/HTTPS/slash chains need release checks. `/shop/robots.txt` returning 404 is not itself an SEO defect: the root domain robots file controls the subpath.

Shop is English-only by locked decision. The LV/RU cookie/query bridge controls Service destinations, not Shop translations. Do not manufacture `/ru/shop` routes or hreflang alternates without genuine equivalent localized content. Technical SEO is foundational work; keyword research, competitor work and scaled editorial landing pages are optional separate scope.

Official interpretation references: [Google canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product-snippet). Sitemaps help canonical discovery but do not replace explicit ownership signals; add truthful offers only where a public retail offer exists, never fake zero prices, wholesale prices or reviews.

## Validation, skills and limitations

| Check | S0 result |
| --- | --- |
| Automated tests | PASS, 204/204, 0 failed, Node test runner across 31 files (Functional QA agent) |
| Lint | PASS, exit 0, no fixes; repeated after final audit outputs, also exit 0. [Final log](evidence/lint-final.log) |
| Production build | PASS after network-enabled retry; first attempt failed fetching Google Inter. [Successful log](evidence/build-retry.log), [initial log](evidence/build.log) |
| Dependency advisory query | COMPLETED, nonzero advisory result: 16 affected production-package entries, including critical Next; no packages changed. [Registry evidence](evidence/dependencies.json) |
| Direct local HTTP | Home, Brand, Model, Admin login and sitemap 200; Account guest 307 to Shop; Checkout guest 500; trailing slash 308. [Results](evidence/http-local.json) |
| Guest Cart browser | PASS add, quantity 1→2→1, reload, remove; only ID/quantity persisted. Fabricated missing ID retained, extra price stripped, Checkout disabled. [Evidence](evidence/cart-interactions.json) |
| Public endpoints | Root robots and Shop sitemap 200; deployment host 200. [Results](evidence/http-external.json) |
| Authenticated transactions | Not run; no designated isolated identity/data environment. No orders, inquiries, accounts, payments or emails created |
| Security rules/indexes | No Firestore/Storage rules, emulator configuration or index manifest found in this checkout; deployed policy is unverified, not presumed insecure |
| Search Console/CWV | No connected Search Console/analytics, field performance or Rich Results Test export; ranking, indexing and Core Web Vitals not certified |

Loaded installed skills: `frontend-design`, `design-taste-frontend`, `webapp-testing`, `web-design-guidelines` (found as lowercase `skill.md`), `seo-audit`, `programmatic-seo`, `site-architecture`. No installed `schema-markup` skill was found in the supplied skill roots/local skill search; schema review uses repository inspection and official Google guidance. This absence does not block an evidence-based audit. Local Next metadata documentation was read from `node_modules/next/dist/docs/`. The approved redesign takes precedence over competing skill house styles; no random design direction or new assets were generated.

The requested Explorer, Functional QA and Visual QA roles were used, never exceeding two simultaneous subagents. No Implementer was invoked. CUA browser host/native pipe were unavailable; Python was inaccessible and Playwright was not installed locally. Visual QA used installed headless Chrome/CDP as a fallback without installing dependencies. See the mapping document for browser evidence and limits.

Dependency interpretation: Next 16.3.5 is in affected ranges returned by the registry. The official [Image Optimization SVG advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) identifies a glibc/Linux image-processing prerequisite; the deployed optimizer/runtime and installed `sharp` must be checked. Source search found no `next/og` ImageResponse, Server Actions or `use cache`, so do not claim the separately reported OG, Server Action or typed-array-cache paths are exercised here. The registry's proposed Firebase downgrade is not an upgrade plan; choose compatible supported fixes after dependency-chain review. No audit fix/install command was run.

Local `sharp` is 0.35.4, below the SVG advisory's 0.35.5 mitigation. This strengthens the dependency release gate, but the Windows audit runtime cannot prove production glibc/SVG reachability. Audit reproduction scripts are archived with `.txt` suffixes so documentation evidence does not enter the repository-wide JavaScript lint scan.

Cleanup limitation: automatic approval review rejected retrying removal of the generated `evidence/chrome-cdp/CrashpadMetrics-active.pma` because it could be active browser state. It remains intact; no bypass or removal of unrelated browser state was attempted. The final cart check also left its generated `evidence/chrome-cart` profile; these temporary browser artifacts are not required reading or application source. Audit preview/reference servers were stopped. Existing tracked/untracked status outside `docs/shop-s0/`, branch and empty staging area match the initial inventory.

## Decisions before implementation

- Confirm the minimum launch assortment and who supplies verified prices, images and physical stock. Unpriced products staying visible is already locked, not a decision to reverse casually.
- Supply/approve an isolated Firebase test environment and test-role identities for destructive lifecycle verification; do not test on production Orders.
- Resolve the stale domain-doc “future courier/parcel delivery/shipping fees” bullet: the earlier locked fulfillment section and current code already implement all three methods and fees. Do not remove working delivery behavior on that stale sentence.
- Confirm how manual order/inquiry queues are monitored at launch; automated email is additional scope unless separately approved.
- Confirm accounting retention/credit-note requirements before changing the currently explicit permanent Order/Invoice deletion behavior. Do not silently reverse the locked rule.
- Review target visual token translation: redesign fonts/square geometry versus current Inter/neutral/aqua tokens; keep one token system and scope public changes away from effective Admin screens.
- Approve any separate Service sitemap/host protection change and optional SEO/content or new-commerce scope.

S0 ends with these documents. The recommended passes are proposals, not authorization to start coding.
