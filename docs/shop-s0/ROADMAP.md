# Recommended implementation roadmap

Owner decision after S2.2 (2026-11-03): no separate hosted Firebase staging project exists. Continue with emulator-based verification and the prepared production rules rollout plan; decide on hosted staging later. Staging is not a blocker for storefront redesign development. Production rules remediation remains an open release action requiring separate explicit approval; no live Firebase modification is authorized. This decision supersedes earlier sequencing that treated hosted staging as a prerequisite for starting redesign.

S3A update (2026-11-03): shared public Shop shell foundations and footer implemented; existing dock/drawer and locale-aware Service switching preserved. See [S3A report](../shop-s3a/INDEX.md). Catalog, Product, and checkout page presentation remain for later redesign passes.

S3B update (2026-11-04): approved landing, dynamic device/brand/model navigation and finder composition implemented; focused tests, lint and production build pass. Rendered browser verification remains outstanding because the existing visual runner previously could not bind localhost; see [S3B report](../shop-s3b/INDEX.md). Product listing/detail redesign remains S3C.

S3C update (2026-11-04): model catalogs, shared product cards, search results and product details now follow the approved light editorial catalog system; dynamic data and purchase/inquiry behavior are preserved. Focused tests and lint pass. Build compilation succeeds but sitemap prerender requires Firebase access unavailable in this environment; rendered browser review remains outstanding. See [S3C report](../shop-s3c/INDEX.md). Cart/authentication/checkout presentation remains S3D.

S3D update (2026-11-04): Cart and auth drawer presentation, checkout form/summary, and Account order rows now follow approved Shop patterns while preserving S1–S2.2 workflows. 101 focused tests and lint pass. See [S3D report](../shop-s3d/INDEX.md).

S4 update (2026-11-04): sitemap generation now runs at request time with bounded stale-cache/503 behavior, public-domain canonical metadata, product and breadcrumb structured data, filter/private-route indexing controls, and 50,000-URL sitemap splitting. Focused tests, lint and production build pass; root sitemap discovery still requires the documented Service robots change. See [S4 report](../shop-s4/INDEX.md) and [Service handoff](../shop-s4/SERVICE_INTEGRATION.md). Hosted/proxy verification remains for S5.

S2.2 update (2026-11-03): the rules rollout plan is ready for separate authorization based on 12 passing emulator tests and the refreshed rules backup. Hosted production revision/permission checks remain deployment limitations; no live change has occurred. Hosted staging is deferred and does not hold Pass 3. The rules exposure remains open until rollout and post-deployment checks.

S2 update (2026-11-03): [security/lifecycle pass](../shop-s2/INDEX.md) completes the authorized local audit and safe corrections from original Pass 1 and Pass 2. Actual deployed rules were retrieved; shared-Service signed-in writes require separate owner remediation. Compatible dependency patches, 261 passing tests and real synthetic PDF verification improve release evidence; isolated SDK lifecycle, pending-checkout recovery, catalog and operating decisions remain gates. Preserve the Pass 1/2 dependencies before moving to Pass 3; no redesign/SEO implementation has started.

S1 update (2026-11-03): the approved narrower authentication/cart/checkout foundation pass has been implemented; see [S1 evidence and limits](../shop-s1/INDEX.md). It adds account-cart persistence and the newly approved missing-retail-price Send Inquiry behavior, fixes guest SSR, and strengthens isolated transaction/race verification. It does not complete every item of the original Pass 1/2: deployed rules, dependency advisory triage, physical catalog readiness and real isolated Firebase/PDF verification remain release gates. Full redesign/SEO and notification services have not begun. Review S1 before authorizing the next pass.

Keep five coherent passes. Stabilize purchase entry and real data before completing those visual surfaces. Shell/catalog visual work may proceed after the first safety gate while isolated transaction QA runs, but release depends on all mandatory gates. No rewrite, new state library, search service or infrastructure is assumed.

## Pass 1 — Reliability and launch prerequisites

**Objective:** make direct journeys healthy and establish a trustworthy verification environment. **Complexity: Medium.**

- Fix guest Checkout SSR, preserve login intent/cart/focus and direct-route response.
- Triage the 16 production dependency advisory entries, review deployed applicability and choose compatible patched versions; do not apply npm's forced/downgrade suggestions automatically.
- Review deployed Firestore/Storage policies and index/deployment ownership; establish isolated Firebase fixture data and role identities.
- Address delayed Cart resolution overwrites with existing request-generation patterns; resolve the settings transaction snapshot requirement.
- Reconcile stale locked-doc fulfillment wording and migration/recovery labels without changing working rules.
- Agree manual order/inquiry monitoring and accounting-retention decisions. Establish build/env/log ownership and font-network reproducibility plan.

**Dependencies:** S0 review; suitable isolated data and policy access. **Expected files:** `AuthControl.js`, `CheckoutAuthGate.js`, `CartContext.js`, `lib/shopOrders.js` if snapshot policy warrants it; package/lockfile and Next-specific guides if updating dependencies; focused tests; relevant domain/architecture/migration docs. Policy changes require their actual owning repository, not invented local config.

**Verification:** clean direct guest Checkout HTTP 200 and client navigation; no portal SSR exceptions; cart persistence/repricing under delayed/reordered responses; denied browser access to sensitive fields/collections; tests/lint/build; existing five-width overlay checks. No production order test.

**Scope:** production readiness and correction of an existing defect. Provisioning new infrastructure or legal/accounting policy changes require separate review.

## Pass 2 — Catalog and commerce readiness

**Objective:** validate an actual sellable assortment and the complete manual-payment order lifecycle. **Complexity: Large**, mostly because live workflows need isolated integration evidence rather than new feature construction.

- Owner supplies verified selling prices, inventory, images and concise descriptions for the launch assortment; preserve active-unpriced visibility and separate compatibility.
- Reconcile current live catalog with older exports; check hierarchy/slugs/SEO fields and image availability, including the existing Product slug beyond the sitemap's length cap; confirm stock rather than trusting migration defaults.
- Test and correct only demonstrated defects in checkout, profile defaults, fee changes, idempotency, transactional stock, invoice storage/recovery, history, status and cancellation.
- Harden image validation/cleanup if demonstrated operational risk warrants it; retain admin editor UX. Define queue monitoring for no-email launch.
- Do not add gateway/notifications/carrier services to make the template look complete.

**Dependencies:** Pass 1 identity/policy/test environment; catalog owner decisions. **Expected files/data owners:** admin product/image validation and managers where necessary; `commerce.mjs`, checkout validation/client, Order/Invoice helpers/APIs, settings and focused integration fixtures. Any future catalog data edits require their own explicit scope; S0 did none.

**Verification:** concurrent last-unit attempts, same request retry (including lost response), another user's UUID, price/stock/account change, all three fulfillment methods and fees, two manual payments, invalid persisted lines, Order/Profile save separation, one Invoice/number per Order, PDF regeneration, owner/staff access, cancel restoration exactly once, terminal cancellation and confirmed deletion behavior. Mocks/intercepts for browser submissions; real database lifecycle only in isolated test environment. Run tests/lint/build.

**Scope:** existing-function production readiness. Additional payments, automated notifications, reservation expiry, credit notes or ERP are optional new work and cannot be silently bundled.

## Pass 3 — Public shell and catalog redesign with SEO foundations

**Objective:** integrate the shared approved visual system and browsing templates while retaining discoverability. **Complexity: Large.**

- Establish public token/font translation using `tokens.css` and CSS Modules; keep effective Admin scope intact.
- Preserve recovered Dock/Cart/Contact implementation; finish Header/mobile navigation, shared footer, Search/Inquiry shell, and keyboard accessibility.
- Port home, Brand and Model templates with runtime hierarchy, existing filters/pagination, active/unpriced/empty/loading/error states and real Service links.
- Add public origin/canonical strategy, metadata/OG and private utility-page noindex; retain and verify existing sitemap generation. Coordinate root sitemap discovery as a separate Service change.
- Resolve public image delivery/priority/dimensions; measure actual read/payload/image cost before caching or adding dependencies.

**Dependencies:** Pass 1 stable boundaries; Pass 2 launch data decisions. Existing catalog behavior is retained even while deeper isolated tests continue. **Expected files:** `app/(shop)/layout.js`, home/Brand/Model pages, `ShopShell`, `ShopHeader`, shared panels/footer, `Homepage*`, `Catalog`, `DeviceProducts`, `ProductCard`, `ProductImage`, public CSS/tokens, `shopCatalog`/metadata/sitemap helpers as needed. Root robots belongs to Service and needs separate authorized implementation scope.

**Verification:** template comparisons at 375/768/1024/1280/1600; keyboard, selected state, focus restore, body locking, reduced motion and long/empty data; crawlable links and active ancestry; anonymous versus wholesale field boundaries; root/proxied canonical and sitemap URL checks; query/trailing slash/noindex policy. Tests/lint/build.

**Scope:** approved redesign plus necessary technical SEO/accessibility foundations. Extensive category copy, competitor/keyword research and programmatic route expansion are optional growth scope.

## Pass 4 — Product, Cart, Checkout and Account presentation

**Objective:** complete approved commerce surfaces around verified production workflows. **Complexity: Medium to Large.**

- Match Product gallery/detail, purchase controls and compatibility presentation; add truthful Product/Offer/BreadcrumbList schema and a consistent business identity reference.
- Finish populated Cart/error/unavailable/retail/wholesale presentation using recovered drawer shell.
- Adapt checkout and account templates to real profile/defaults/fulfillment/payment/Order/Invoice states; retain checkout Dock validation/loading/completed behavior.
- Add only data-supported product specifications or conversion copy; keep Model lists out of descriptions and avoid template-only promises/ratings.

**Dependencies:** Pass 2 commerce verification; Pass 3 shared components/metadata policy. **Expected files:** Product route/gallery/purchase, `CartDrawer`, checkout client/styles/auth gate, Account components/styles, shared price/Invoice presentation, schema helper if responsibility is distinct.

**Verification:** screenshot comparisons across five widths with valid/invalid/full/empty Cart, all price entitlement states and long compatibility names; guest/direct/auth transitions; safely intercepted order success/conflict/failure; screen-reader errors/status; rendered schema and Rich Results Test; no cost/wholesale leakage in public structured data; tests/lint/build. Full account/checkout screenshots require test identities.

**Scope:** redesign of implemented commerce. Related-product algorithms, quality attributes, new payments and customer self-service actions need separate product/data decisions.

## Pass 5 — Release qualification

**Objective:** demonstrate a stable proxied production release with rollback and operating ownership. **Complexity: Medium.**

- Repeat end-to-end lifecycle only on isolated data; check authorization, private invoices, duplicate prevention and stock under concurrency.
- Verify all public routes/assets/statuses, not-found behavior, root robots/sitemap discovery, canonical ownership, noindex utility routes and deployment-host handling through the real proxy.
- Complete five-width screenshots, keyboard/touch/reduced-motion and loading/failure checks, image/font failures, device testing and performance measurements.
- Verify launch catalog, queue ownership, settings/invoice identity, required legal destinations, backups and rollback. Document approved remaining deferrals.
- Update the migration tracker with actual completion evidence rather than carrying forward ambiguous labels.

**Dependencies:** mandatory fixes and passes 1–4 accepted. **Expected files:** scoped fixes only, tests, deployment/runbook and architecture/design/migration documentation. No broad cleanup or unapproved service deployment.

**Verification:** tests/lint/build pass; direct guest Checkout 200; complete isolated transaction evidence; verified deployed policies; template comparisons accepted; public proxy/canonical/sitemap checks pass; no private fields in HTML/API/schema; owner sign-off on catalog and manual payment/notification operating process. Field CWV/Search Console indexing require post-release observation and must not be claimed from a local build.

## Explicitly separate optional work

Keyword/competitor research, extensive category editorial work, translated Shop routes, scaled SEO landing pages, reviews/ratings, recommendation systems, online gateway, carrier integration, automated email, ERP and credit/correction invoice automation require new scope. The minimum reliable path is to complete and verify existing behavior, then reproduce approved templates around it.

## S2.1 follow-up — 2026-11-03

See [S2.1 release-gate report](../shop-s2-1/INDEX.md): durable checkout recovery and deletion/PDF coordination implemented, actual isolated Firebase integration/rule tests added, and least-privilege shared rules prepared. Production rule deployment remains OPEN; local tests do not close that exposure. Historical findings/evidence above remain as recorded at the original pass.
