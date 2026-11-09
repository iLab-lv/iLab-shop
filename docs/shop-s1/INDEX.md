# S1 — Authentication, Cart and Checkout foundations

Follow-up 2026-11-03: [S2](../shop-s2/INDEX.md) preserves these S1 foundations and adds scoped auth/private-response hardening, dependency patches, lifecycle tests and actual synthetic PDF verification (261 total passing tests). Deployed Shop rule source is now inspected; shared-Service rule permissions and remaining isolated integration/recovery gates are documented there. The original S1 evidence below remains unchanged.

Implementation started 2026-11-03 (Europe/Riga), on `home_design` at `6d6c371`. Existing uncommitted redesign work and all S0 evidence are preserved. [Before manifest](evidence/before-manifest.json) records filenames/hashes/status before S1; the already locked S0 Chrome crash-metrics artifact could not be hashed and was left untouched. The existing diff is archived in `evidence/before-worktree.patch`.

## Minimum account-cart change (recorded before implementation)

The existing cart has React context and a localStorage identity array, but no account persistence. Add only server-owned `shopCarts/{authenticatedUid}` documents and `/shop/api/cart/account`. Documents store Product IDs/quantities plus revision, bounded idempotency receipts and timestamps, never prices, entitlement or customer details. The route derives ownership from the verified active session, checks origin on writes, uses private/no-store responses and Admin SDK transactions. No browser Firestore write is introduced and no deployed rules are changed. Deployed rules for this collection remain an explicit verification limitation.

Merge policy: union by Product ID; for the same Product keep the **larger requested quantity** from the account and guest carts, rather than counting a repeated basket twice. No variants exist in the present schema. Repeated operation UUIDs are idempotent; repeated auth signals must not start new guest merges. Quantities remain within the existing 99-per-line/100-line limits. A combined basket beyond those limits fails visibly and leaves both source baskets intact. Missing/unpriced/out-of-stock items are retained for explicit review, and over-stock requested quantities block purchase instead of silently disappearing. Prices and stock are always re-resolved. Subsequent account edits are individual transactional operations rather than whole stale-cart replacement.

Browser local identity ownership must distinguish a guest basket from an account mirror so one account's items are not merged into another account or reimported after logout. Guest identity is consumed only after successful association; failed sync preserves the draft and blocks checkout until retried. Order completion removes only purchased quantities from the account basket in the Order transaction, preserving unrelated additions from another device.

## Approved rule update

S1 supersedes the former priced-only availability-inquiry rule. An active Product without a positive safe-integer retail price offers one **Send Inquiry** action, even when a wholesale price exists. Zero, negative, fractional, invalid and null retail values are unavailable, never free Product offers. Valid retail plus stock permits existing entitlement-aware selling-price selection; missing-price and out-of-stock reasons remain distinct. The same shared resolver protects Cart and Order creation. No Product data is modified.

## Scope

Use existing Firebase email/password authentication and inquiry flow. Fix server rendering and checkout continuation, account-cart association, race handling and focused keyboard/error states. Preserve Order/Invoice/manual-payment/fulfillment workflows. Review notifications without adding a provider, sending emails or creating real Orders/Inquiries. Full redesign, SEO, dependency upgrades and Service/proxy edits are outside S1.

## Authentication and Checkout correction

Root cause of S0's HTTP500: `AuthControl` initialized the checkout login modal open, then evaluated `createPortal(modal, document.body)` during server rendering. The portal now uses a browser-mounted snapshot. Direct unauthenticated `/shop/checkout` renders the existing login/registration gate with HTTP200; `/shop/api/orders` independently returns controlled HTTP401 without creating anything.

The existing Header AuthControl handles guest Cart checkout intent before navigation. Login and normal registration establish the existing Firebase-backed session, associate the guest/account cart, then navigate to `/checkout`; failed authentication leaves the guest basket intact. Failed cart synchronization retains a local draft and exposes Retry instead of continuing. Active signed-in buyers with a ready cart proceed directly. Header and direct-route gate share the auth-action lifecycle so a second observer cannot try to create a session before registration creates its Profile. The modal retains the existing interface and adds Tab containment, ARIA selected state and duplicate-submit protection. Global Search invalidates again when the server session becomes ready, preventing data fetched during login from retaining stale entitlement.

Existing normal registration still creates an active Customer; wholesale approval semantics are unchanged, and wholesale enrollment stays outside checkout registration. No existing password-reset UI or email-verification requirement was found. Neither was invented as an S1 prerequisite or tested with real email.

## Backend authority and order lifecycle

The existing Order transaction is preserved. Product records, active status, positive retail/applicable prices, quantities, stock and totals are checked server-side. Browser UID/price/stock/total claims do not become authority. Settings now participate in the transaction read set, so fees, pickup, tax and seller snapshot changes are included in conflict handling. The same transaction allocates the Riga-year number, creates immutable Order/Invoice snapshots, deducts stock and subtracts purchased account-cart quantities. Retrying the same request UUID returns the existing Order without repeating those mutations; a different owner is rejected. Non-safe totals are rejected. Validation, auth, conflict and unexpected error responses use private/no-store; authenticated order mutations also require same origin.

Customer confirmation remains in place with Invoice view/download and Account history. Checkout refreshes the reduced account cart after confirmation instead of clearing another device's additions. Failed submissions retain the draft/cart. Bank transfer/cash, all three fulfillment methods, separate Order/payment statuses, private PDF generation/recovery, historical Account Orders, admin queue and exactly-once cancellation stock restoration remain existing workflows. S1 does not replace the payment or Invoice systems.

No automatic customer/admin Order email integration or email provider was found. Inquiry and invoice emailing are already deferred. For a low-volume launch, assign an owner to check the existing admin Orders/Inquiries queues and manually reconcile bank transfers/payment statuses; agree response hours and customer communication. If those queues cannot be monitored reliably, decide automated notifications separately. S1 sends no mail and adds no service.

## Validation and evidence

**232 tests pass, 0 failures/skips; lint passes; production build passes.** The S0 baseline was 204 tests. Existing applicable suites remain, with targeted eligibility expectations updated and 28 net new tests. See [test output](evidence/tests.log), [lint](evidence/lint.log) and [build](evidence/build.log).

| Required behavior | Verification and limits |
| --- | --- |
| Guest adds item, presses Checkout, gets Login/Create Account | Actual rendered Shop at 375/768/1024/1280/1600; URL stays on Product before auth; item remains in Cart. [Viewport metrics](evidence/visual-metrics.json). |
| Login/registration preserve Cart and continue | Actual Firebase client/UI with identity/profile/session/account responses intercepted locally. Both merge guest quantity 1 with account quantity 2 once into 2, clear only acknowledged guest identity and navigate to Checkout. [Login](evidence/mock-auth-login.json), [registration](evidence/mock-auth-register.json). Mock cookies cannot authenticate the real server gate; these are **client mock** results, not live Firebase sign-in certification. |
| Existing saved basket, refresh, repeated authentication | Behavioral `cart-sync.test.mjs` with shared fake storage/server: same-UID association deduplicates, MAX union retains all IDs, a fresh controller replays a lost-response outbox with the same UUID, and account switch/sign-out cannot consume or overwrite guest data. `account-cart.test.mjs` covers limits and operations. |
| Missing-price / out-of-stock / both | Rendered Product pages and inquiry panels: one Send Inquiry, no Add to Cart or fake €0, correct Product/SKU/compatible Model. [Missing price](evidence/interactions.json), [out of stock](evidence/interactions-battery-for-iphone-14.json); additional combined-condition evidence is in the evidence directory. No Inquiry submitted. |
| Direct route and unauthorized APIs | Actual local HTTP: guest Checkout 200; Orders POST and account-cart GET/POST 401, private/no-store. [HTTP evidence](evidence/http-guest.json). Requests used no auth cookies. |
| Direct purchase of unpriced/invalid retail | Real `shopOrders.js` executed with isolated I/O doubles rejects null/zero/negative/fractional retail, including wholesale buyers and forged client price fields; stock/Order unchanged. |
| Stale total/unavailable Product/invalid quantity/auth | Real server-module tests reject safely without writes; route-level tests independently check 401/403/400 and private headers. |
| Mocked successful/failed Order, concurrency and replay | `checkout-server.test.mjs` executes the real module with a serializing in-memory Firestore transaction double: one final-unit buyer succeeds, same UUID allocates/deducts once, another UID is rejected, account cart subtracts purchased quantities and retains unrelated items. This proves application paths against a double, **not deployed Firestore concurrency/SDK retry behavior**. PDF I/O is stubbed. |
| Saved-cart ownership and cross-account queues | Real service + route tests bind document path to active session; client expected-UID assertion rejects a queued operation after an account switch; arbitrary body UID/price is ignored as authority. Another account's saved cart is unchanged. |
| Validation errors and mobile keyboard | Browser mismatch-password alert, guest Cart preserved, Tab wrap/Escape/focus restoration and no horizontal overflow across five viewport sizes. [Interaction results](evidence/interactions.json), [375 registration](evidence/auth-register-375.png), [375 inquiry](evidence/inquiry-375.png). |

Browser write requests were blocked or fulfilled locally; only the existing read-only Cart resolution POST could reach the application. No production Order, stock deduction, account creation/saved-cart write, Inquiry, email, payment or notification was triggered. Browser tests used installed headless Chrome/CDP because Python/Playwright and CUA browser services were unavailable; no dependency was installed. This fallback and short screenshot capture waits do not certify performance or physical-device behavior. The final guest Retry message correction was verified by a targeted behavioral test and another successful full test/lint/build run after the browser captures.

The installed `webapp-testing`, `web-design-guidelines`, `frontend-design` and `design-taste-frontend` skills were applied to focused testing/usability; the approved existing visual direction was retained. No broad redesign or SEO work was started. Explorer, Implementer, Functional QA and Visual QA were used with at most two simultaneous subagents; root completed partial Implementer work when those agent turns hit model capacity.

## Files changed and preservation

- Eligibility/inquiry: `lib/commerce.mjs`, `partInquiry.mjs`, `shopInquiries.js`, public `shopCatalog.js`/`shopProducts.js`; ProductCard, ProductPurchase, AddToCartButton, PartInquiryCard and SearchPanel.
- Auth/cart: AuthControl, `lib/auth/clientSession.js`, CartContext/CartDrawer and a scoped notice style, SearchContext; new `lib/accountCartModel.mjs`, `cartSync.mjs`, `shopAccountCart.js` and `app/api/cart/account/route.js`.
- Checkout/server: CheckoutClient, Orders route and `lib/shopOrders.js`.
- Tests: updated commerce/inquiry/checkout-dock expectations; new account-cart, cart-sync and checkout-server behavior suites plus an isolated server-module/I/O loader under `tests/helpers/`.
- Docs: domain/architecture/development/file map, dated S0 issue/roadmap statuses, and this S1 package. [Change manifest](evidence/change-manifest.json) records changes against the actual before-state, including earlier uncommitted files. Initial modified files outside S1 remain unchanged; S0 screenshot evidence is preserved. One previously locked S0 Crashpad file remains unreadable/unmodified by this work.

No stage, commit, branch switch, push, merge, deployment, obsolete-clone use or Service/recovery-reference write occurred. The branch remains `home_design`, HEAD `6d6c371`; staging remains empty.

## Outstanding gates and decisions

1. **Deployed Firestore/Storage rules remain unverified.** This checkout has no deployed rules/index manifest or emulator setup. Before release, verify browser reads/writes for `shopCarts`, users, Orders and private Invoices under each role, especially that clients cannot read another cart or write server-owned documents directly. No broad rules change/deployment was attempted. Server ownership/validation tests do not certify deployed rules.
2. Exercise authenticated checkout, PDF generation/recovery, last-unit contention and cancellation against a designated isolated Firebase project/identities before release. No destructive production substitute was used. Authenticated CheckoutClient success/failure browser screens were not certified; Order logic and client auth/cart continuation were tested separately as described.
3. S0 dependency advisories remain outside this scoped pass and require compatibility/applicability review before release. No package/lockfile update was made.
4. Catalog prices/images/physical stock still need owner verification; S1 deliberately changes no Product data. An unpriced catalog now has the requested inquiry path, not invented prices.
5. Decide notification automation and operational ownership separately. Password recovery UX is absent; email verification is not an existing requirement. Choose any additions explicitly rather than blocking normal checkout by an invented rule.
6. Account operation receipts are bounded to the latest 100 operations. MAX guest merging is naturally repeat-safe; the tested retry window uses retained UUID receipts. Broader offline/multi-device conflict/history policies are not a new collaborative-cart product in S1.
7. Oversized combined baskets reject without changing either source; the user must reduce the guest basket or existing saved basket and retry. Unavailable lines are retained for review; no stock is silently clamped.

Recommended next step: review S1 and authorize a bounded release-safety pass for deployed rules, dependency remediation and isolated Firebase/PDF verification. Broader storefront redesign can then proceed against the S0 mapping. No next pass has begun.

## S2.1 follow-up — 2026-11-03

See [S2.1 release-gate report](../shop-s2-1/INDEX.md): durable checkout recovery and deletion/PDF coordination implemented, actual isolated Firebase integration/rule tests added, and least-privilege shared rules prepared. Production rule deployment remains OPEN; local tests do not close that exposure. Historical findings/evidence above remain as recorded at the original pass.
