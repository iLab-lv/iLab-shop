# iLab Shop release-readiness audit

Date: 2026-11-09, Europe/Riga. Audit and planning only. Start with [Architecture and reuse](ARCHITECTURE_AND_REUSE.md), then [Design consistency](DESIGN_SYSTEM_CONSISTENCY.md), [Data and commerce](DATA_AND_COMMERCE.md), and [SEO/integration](SEO_AND_INTEGRATION.md).

## Verdict

**Not yet certified for production release.** The current working tree has a credible, reusable architecture and passing automated commerce safeguards. No P0 or demonstrated authoritative-price, concurrent-stock or order-privacy failure was found in the inspected/tested paths. Release still needs a narrow accessibility correction, reconciliation of the locked Search contract, complete deployment of the intended candidate, and proof of Production Firebase/Vercel settings. Broad presentation/editor refactoring is not a prerequisite to every sale.

Shop's approved light theme is retained. Public typography already shares Geologica/IBM Plex Mono, a 17px/1.55 body, related spacing scales and 96px rulers with Service. Differences in theme, display scale and transactional density are not defects. Ruler dimensions can remain; their overlay/utility/mobile lifecycle needs targeted correction.

The main architectural issues are repeated public overlay behavior, three similar public product projections, repeated hierarchy reads, ten money-formatting owners, and compressed Admin orchestration. Existing ProductCard, ServiceLinkCard, Breadcrumbs, WholesaleNetPrice, inquiry panel and Admin editing primitives are valuable shared foundations; do not replace them with a universal configurable component or cross-repository dependency.

## Scope and preservation

| Item | Audited state |
| --- | --- |
| Shop | `C:/Users/info/Desktop/shop`, `home_design`, HEAD `6d6c371` (`done`), substantial pre-existing tracked/untracked work |
| Service | `C:/Users/info/Desktop/website/iLab`, `feature/redesign-integration`, HEAD `84f4108` (`Fix bottom CTA spacing and border containment`), pre-existing untracked guidance/docs/tmp artifacts |
| Historical reference | Service R8 PRE_RELEASE_AUDIT and REMEDIATION_RELEASE_PREPARATION read; current source takes precedence over their older snapshots |
| Firebase | Both local public/server project IDs `ilab-v2`; both Admin SDKs use default Firestore database. Production project/rules/env scope not independently verified. |
| Implementation destination | Only authoritative Shop checkout. Recovery Shop copy was not used. Service was not edited. |
| Task writes | Five requested reports; ignored isolated build/browser helpers/results. No application/config/test/package/rules implementation edits. |

A production build ran from an ignored source copy to avoid replacing the user's `.next`. At the end, all **211 app/lib files** in that copy matched the actual checkout byte-for-byte. This is evidence of runtime-source correspondence, not a claim that every byte of every dependency/public asset was independently security-audited. Existing changes were neither reverted nor committed. No push, production data mutation, real order, email or payment action occurred.

## Validation results

| Check | Actual result and limits |
| --- | --- |
| Unit suite | `npm.cmd test`: **297/297 pass**, no skipped/failed tests, ~24s. Includes pure commerce/profile/catalog/search, mock server authorization/Orders, Cart sync/recovery and invoice service contracts. |
| Lint | `npm.cmd run lint`: **exit 0, no diagnostics**. Ignored isolated source does not contaminate the scan. |
| Production build | **PASS**, Next.js **16.4.4** Turbopack; compiled ~19s, static generation 9/9. First sandbox run could not fetch Google fonts; rerun with network succeeded. Source was not changed to bypass fonts. Multiple-lockfile root warning is caused by the isolated audit copy and is not attributed as a repository defect. |
| Firebase emulator regression | `node scripts/run-emulator-tests.mjs`: **12/12 pass**, demo-only project, explicit loopback Auth/Firestore/Storage, external credentials stripped. Real Admin SDK transactions cover last-unit concurrency, owner reads, Cart merge/replay, price conflict, invoice failure/upload/deletion tombstone, proposed rules and Service Admin compatibility. Proposed rules passing does not prove deployed rules. |
| Mocked Checkout browser harness | Existing `tests/browser/checkout-recovery.cjs`, loaded unchanged with only output/bundle paths redirected to ignored audit folder: **16/16 scenarios** at 375 and 1280. Recovery after refresh/empty Cart, cancelled state, 404 retry with stable UUID, 401/410 recovery and submit gates, network-failure UUID reuse. Every order request was locally fulfilled/aborted; no real order created. Harness uses Inter fixture and does not certify full public-shell design. |
| Production browser smoke | Isolated built app with current public catalog, all browser methods except GET/HEAD blocked. Home at **390/768/1024/1280/1440**; Brand, Model, Product at **390/1440**; guest Checkout at 390; unauthenticated Account redirected home. **No uncaught page errors and no measured horizontal overflow.** Search and mobile menu checked. Current Geologica computed font and local canonicals confirmed. |
| Browser defects | Two main landmarks in sampled public pages; Tab escaped mobile modal to page actions; background ruler remained visible behind Search. Viewed representative mobile Home and desktop Product screenshots: mobile hero artwork overlaps secondary action area. These checks are diagnostic, not a claim that the audit passed accessibility. |
| Deployed integration | Home/Brand/Product deep GET 200; one RSC prefetch 200 text/x-component; mounted CSS 200 immutable; sitemap 200, 744 total URLs; unauthenticated Admin Orders denied 401. Live canonical/robots/recovery differences are SI-01. |
| Local protected GETs | Admin Orders and synthetic owner-recovery request both 401, `private,no-store`, X-Robots-Tag noindex/nofollow. No real customer's order ID or data was used. |
| Production dependencies | Read-only npm audit: **12 affected package entries, 4 high / 8 moderate / 0 critical**. Parent-chain counts overlap. Conditional gRPC/UUID reachability requires triage; see Data report. No package changes or audit-fix command. |

PowerShell's `npm.ps1` policy prevented the first command invocation; the normal Windows `npm.cmd` entrypoint ran the checks. Python was unavailable, so existing Node/Playwright test infrastructure was used. Browser-extension access was unavailable; headless test Chromium provided the local runtime checks. None of these environment limitations is counted as an application defect. Emulator shutdown logged inability to terminate its Firestore child; a later process check found that PID absent. The audit's local production server was stopped and port 3026 no longer accepted connections.

## Deduplicated findings and totals

**Confirmed defects/gaps: P0 = 0, P1 = 4, P2 = 7 (11 total).** These include a confirmed deployment gap and a confirmed test-contract gap; they do not mean four security vulnerabilities. **Seven additional P2 architectural/operational recommendations** are listed separately. Thus all prioritized entries together are **P0 0 / P1 4 / P2 14**, across 18 unique IDs. DC-01 and dependency/deployment verification gates are excluded from those counts. Shared findings referenced by multiple reports count once.

| ID | Priority | Classification | Finding | Deployment blocker |
| --- | --- | --- | --- | --- |
| AR-01 | P1 | Confirmed browser defect | Mobile modal focus escapes to obscured page | **Yes**, accessibility release gate |
| AR-03 | P1 | Confirmed source/locked-rule conflict | Public Search has separate eight-Model results instead of attached <=5 suggestions | No; correct or explicitly reconcile before release |
| SI-01 | P1 | Confirmed deployed gap | Live canonical/robots/recovery candidate mismatch | **Yes**, intended-release certification |
| SI-02 | P1 | Confirmed integration mismatch | Service Shop transition omits current Service locale | No; important pre-release coherence |
| AR-02 | P2 | Confirmed semantic defect | Nested main landmarks and Account root breadcrumb duplication | No |
| AR-06 | P2 | Confirmed read amplification | Multiple uncached full hierarchy reads per public render | No |
| AR-10 | P2 | Confirmed coverage/contract gap | Source tests pass while enforcing obsolete Search layout and missing modal behavior | No |
| DS-01 | P2 | Confirmed lifecycle/interaction gap | Rulers unblocked behind overlays, running below desktop, irrelevant on utility pages, mixed accessible language | No |
| DS-03 | P2 | Confirmed visual defect | Mobile hero image overlaps secondary CTA area | No |
| SI-03 | P2 | Confirmed image projection gap | Storage image missing from Product schema; client image-loading follow-up | No |
| DC-02 | P2 | Confirmed defensive edge case | Accepted extreme unit prices can overflow precise Cart arithmetic | No |
| AR-04 | P2 | Recommendation | Consolidate four overlay lifecycle implementations | No |
| AR-05 | P2 | Recommendation | Consolidate public product/Type projection assumptions | No |
| AR-07 | P2 | Recommendation | Share narrow money/service-link presentation | No |
| AR-08 | P2 | Recommendation | Fix content/config owner exceptions and name-based curation | No |
| AR-09 | P2 | Recommendation | Split compressed editor/orchestration responsibilities | No |
| DS-02 | P2 | Recommendation | Consolidate effective CSS/token roles and outdated design prose | No |
| DC-03 | P2 | Operational recommendation | Define invoice orphan/failed-PDF monitoring and cleanup process | No |

Each detailed report gives source/runtime evidence, scope, impact, proposed approach, effort and blocker status. P2 recommendations are not disguised mandatory release blockers.

## Mandatory release evidence still missing

1. **DC-01:** prove current Vercel Production Firebase public/server IDs, effective deployed Firestore/Storage rules and required query indexes. The local intended project is known; do not deploy proposal rules merely because emulators pass. Preserve shared Service permission policies.
2. Identify exact Shop and Service deployment commits, project/repository bindings, Production branch, env scopes/domains and retained rollback deployments. No signed-in Vercel inspection was completed. Large uncommitted Shop work must be assembled into a reviewed candidate; HEAD alone is insufficient.
3. Triage the recorded production dependency advisories and document fix/accepted residual risk with runtime reachability evidence. No reachable exploit was demonstrated; npm's suggested old Firebase major is not an automatic fix.
4. Verify controlled authentication cookies/session lifecycle and LV/RU roundtrip in Preview; repeat protected pricing/owner/non-owner/Admin/Staff checks using synthetic data or the existing demo/mocked boundaries. No real customer identity was used in browser QA.
5. Confirm staff order/inquiry monitoring, bank-transfer/pickup instructions, invoice recovery and the intended customer notification process. Real delivery/receipt and payment handling were not exercised. Card payment is not part of the required scope.
6. Final contrast/screen-reader checks and representative authenticated Account/Admin mobile states remain unverified. Browser page-error absence does not prove no console warnings, field CWV, complete hydration safety, bundle-size budget or all image optimizer paths.

## Practical remediation stages

Effort estimates in detailed reports are rough engineering work, not commitments. Each stage should be independently reviewable; avoid bundling all of them into a single rewrite.

| Stage | Objective / files | Benefit | Risks / verification |
| --- | --- | --- | --- |
| 1. Establish safe release baseline | Confirm DC-01 + dependency reachability + actual Vercel/deployment identity. Fix AR-01 in ShopHeader/shared overlay mechanics and AR-02 landmarks. | Known candidate, accessible navigation, reliable security boundary evidence | Keep Firebase/Ads untouched. Keyboard menu focus/Escape/restore, auth/cart panel scroll restoration; mocked and demo security checks. No production test writes. |
| 2. Public data contracts and read ownership | `shopCatalog.js`, `shopProducts.js`, pure public projection helper; request-scope active hierarchy/Types; agree DC-02 amount bounds | One public normalization contract, fewer reads, precise monetary failure behavior | Cost/wholesale leakage and accidental permission caching. Test invalid/null/legacy fields, active ancestry, guest/Partner/Admin projections; run commerce suites. |
| 3. Shared feature consolidation | AR-04 overlay lifecycle, AR-07 formatter/service content, AR-09 Product editor/image orchestration | Less repeated behavior and easier review without visual redesign | Preserve saved drafts, cleanup, dirty confirmation, order flow. Focused component/browser checks, Admin mocked save/upload failure paths. Split editor work from overlay work if review grows. |
| 4. Content and Search contract | AR-03/10 Search decision + attached navigation suggestions/tests; AR-08 public seller projection, stable Finder identities and concise content review | Locked behavior matches UI/tests; business content has clear owner | Do not change Product modelIds from prose or rewrite old records. Test global products, <=5 focus-bound suggestions and Admin's distinct filter shortcut. Review three-hour promise without inventing a new SLA. |
| 5. Tokens, CSS and ruler lifecycle | DS-01/02/03; ShopNavigationRulers, effective page CSS, HomepageHero, design docs | Coherent implementation of approved design, fewer override mistakes and hidden listeners | Preserve light theme/96px rail system. Desktop section clicks/range/active state; utility/no-section and overlays; mobile no listeners; representative widths and reduced motion. |
| 6. SEO and separate-app integration | SI-02 Service locale transition in a separately authorized Service task; SI-03 public image adapter; verify SI-01 candidate in Preview | Public-domain canonical/schema images, correct LV/RU return context | Cross-app RSC and cookie/proxy behavior; do not change Ads. Test conflicting locale cookie + current Service language; nested refresh, assets, image optimizer and sitemap discovery. |
| 7. Candidate regression and release preparation | Complete reviewed Shop candidate + narrow approved Service integration changes; full test/lint/build once on final inputs | Evidence attached to exactly what will ship | Run unit + emulator + mocked commerce browser regressions, targeted accessibility/visual checks, then Preview/public GET smoke. Retain rollback and explicit deployment approval. |

Only narrow corrections and verification gates must precede release. AR-05/07/09, broader CSS cleanup, request optimization and DC-03 operations automation can be scheduled after release when their risks are explicitly accepted. Do not postpone AR-01 or use passing unit tests to override a locked-contract conflict.

## Proposed deployment sequence — not executed

1. Obtain a reviewed, complete candidate and record both repository SHAs. Verify Production bindings, approved env values and current rollback artifacts. Any Firebase rule/index change requires its own reviewed compatibility plan; no such change is assumed necessary here.
2. Deploy the approved **Shop Preview first**, using intended shared-project read policies or controlled demo fixtures. Verify new recovery/account-cart/invoice endpoints and public metadata, including wholesale/private caching boundaries.
3. Verify the **Service Preview** with the approved locale-link and current sitemap discovery changes while retaining existing Shop origin and Ads routing. Exercise both ordinary HTML navigation and RSC/prefetch/asset paths.
4. After explicit final approval, release Shop Production first and verify its direct/public endpoints. Then release the approved Service integration candidate. The existing rewrite origin can remain; do not flip it to an arbitrary Preview URL.
5. Smoke-check public home/Brand/Model/Product, exact canonicals, sitemap/robots, protected denial headers, assets and LV/RU roundtrip. Controlled purchase/notification tests require separately authorized non-production or disposable test scope. Monitor runtime/order/invoice failures and retain independent application rollback options; deploying/rolling back code does not roll back Firestore data.

Audit ends with these reports. No implementation or deployment action is authorized by their proposed plan.
